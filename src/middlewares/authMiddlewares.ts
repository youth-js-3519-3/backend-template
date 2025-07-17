import { Request, RequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface CustomRequest extends Request {
    userInfo: JwtPayload;
}

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
