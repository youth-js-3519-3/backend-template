import { Router } from "express";
import { PrismaClient } from "../../generated/prisma";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { authMiddleware, CustomRequest } from "../middlewares/authMiddlewares";
import * as zod from 'zod'

const authRoutes = Router()
const prisma = new PrismaClient()

const RegisterDTO = zod.object({
    name: zod
        .string('A informação precisa ser uma string')
        .max(255, {
            error: 'O cumprimento máximo é 255'
        }),
    email: zod.email(),
    password: zod.string(),
    document: zod.string()
})

authRoutes.post('/register', async (req, res) => {
    const { body } = req;
    
    try {
        RegisterDTO.parse(body)
    } catch(error) {
        res.status(400).send({
            message: "Requisição inválida",
            details: zod.treeifyError(error as zod.ZodError)
        })
        return
    }

    body.password = await argon2.hash(body.password)
    const {password, ...createdUser} = await prisma.user.create({
        data: body
    })

    res.send(createdUser)
})

const LoginDTO = zod.object({
    email: zod.email(),
    password: zod.string()
})

authRoutes.post('/login', async (req, res) =>{
    const { body } = req;
    const { email, password } = body;

    // Body está correto
    try {
        LoginDTO.parse(body)
    } catch(error) {
        res.status(400).send({
            message: "Requisição inválida",
            details: zod.treeifyError(error as zod.ZodError)
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