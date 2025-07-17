import { Router } from "express";
import { PrismaClient } from "../../generated/prisma";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { authMiddleware, CustomRequest } from "../middlewares/authMiddlewares";

const authRoutes = Router()
const prisma = new PrismaClient()

authRoutes.post('/register', async (req, res) => {
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

authRoutes.post('/login', async (req, res) =>{
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

authRoutes.get('/profile', authMiddleware, async (req, res) => {
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

export default authRoutes