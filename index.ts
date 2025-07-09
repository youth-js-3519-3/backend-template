import express, { json, Request, RequestHandler } from 'express'
import cors from 'cors'
import argon2 from 'argon2'
import { PrismaClient } from './generated/prisma'
import 'dotenv/config'
import jwt, { JwtPayload } from 'jsonwebtoken'

const app = express()

app.use(json())
app.use(cors())

const port = process.env.PORT || 8000;

app.get('/', (req, res) => {
    res.send('Hello World!')
})

const prisma = new PrismaClient()

app.post('/auth/register', async (req, res) => {
    const { body } = req;
    if (!body.name || !body.email || !body.password || !body.document) {
        res.status(400).send({
            message: "Requisição inválida"
        });
        return;
    }

    body.password = await argon2.hash(body.password)
    const {password, ...createdUser} = await prisma.user.create({
        data: body
    })

    res.send(createdUser)
})

app.post('/auth/login', async (req, res) =>{
    const { body } = req;
    const { email, password } = body;

    // Body está correto
    if (!email || !password) { 
        res.status(400).send({
            message: "Requisição inválida"
        });
        return;
    }

    // Usuário existe
    const user = await prisma.user.findFirst({
        where: {
            email
        }
    })

    if (!user) {
        res.status(400).send({
            message: "Usuário não cadastrado"
        });
        return;
    }

    // Senha correta
    const verification = await argon2.verify(user.password, password)

    if (!verification) {
        res.status(400).send({
            message: "Senha inválida"
        });
        return;
    }

    // Deu tudo certo, vamo pra cima
    const payload = {
        id: user.id
    }
    const token = jwt.sign(payload, process.env.SECRET_KEY as string)

    res.send({ token })
})

export interface CustomRequest extends Request {
 userInfo: JwtPayload;
}

const authMiddleware: RequestHandler = async (req, res, next) => {
    const { headers } = req;
    const { authorization } = headers;

    if (!authorization) {
        res.status(403).send({
            message: "Usuário não autenticado"
        })
        return;
    }

    // Bearer jwtToken
    const token = authorization.split(' ')[1];

    if (!token) {
        res.status(403).send({
            message: "Usuário não autenticado"
        })
        return;
    }

    try {
        const verification = jwt.verify(token, process.env.SECRET_KEY as string);
        (req as CustomRequest).userInfo = verification as JwtPayload;
        next()
    } catch {
        res.status(403).send({
            message: "Usuário não autenticado"
        })
    }
}

app.get('/auth/profile', authMiddleware, async (req, res) => {
    const { userInfo } = req as CustomRequest
    const { id } = userInfo;

    const user = await prisma.user.findFirst({
        where: { id }
    });

    if (!user) {
        res.status(404).send({
            message: "Usuário não encontrado"
        })
        return;
    }

    const { password, ...foundUser } = user;

    res.send(foundUser)
})

app.listen(port, () => {
    console.log('Aplicação rodando na url http://localhost:' + port);
})