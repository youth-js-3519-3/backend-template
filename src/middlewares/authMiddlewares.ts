import { Request, RequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { PrismaClient } from "../../generated/prisma";

export interface CustomRequest extends Request {
    userInfo: JwtPayload;
}

const prisma = new PrismaClient()

export const authMiddleware: RequestHandler = async (req, res, next) => {
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

type RoleCheckType = (acceptedRoles: string[]) => RequestHandler

export const roleCheck: RoleCheckType = (acceptedRoles) => async (req, res, next) => {
    const { userInfo } = req as CustomRequest

    const user = await prisma.user.findFirst({
        where: {
            id: userInfo.id
        }
    })

    if (!user) {
        res.status(401).send({
            message: "Usuário não encontrado"
        })
        return
    }

    const isAccepted = acceptedRoles.includes(user.role)

    if (!isAccepted) {
        res.status(403).send({
            message: "Ação não permitida"
        })
        return
    }

    next()
}
