import { Router } from "express";
import { PrismaClient } from "../../generated/prisma";
import { authMiddleware } from "../middlewares/authMiddlewares";
import * as zod from 'zod'

const orderRoutes = Router()
const prisma = new PrismaClient()

const OrderProductsDTO = zod.array(zod.object({
    id: zod.uuid(),
    quantity: zod.int()
}))

const OrderDTO = zod.object({
    items: OrderProductsDTO,
    payment: zod.object({
        type: zod.enum(['credit', 'debit']),
        number: zod.string().length(12),
        cvv: zod.string().length(3),
        name: zod.string(),
        document: zod.string().length(11)
    })
})

orderRoutes.post('/buy', authMiddleware, async (req, res) => {

})

orderRoutes.post('/gateway-confirm', async (req, res) => {

})

export default orderRoutes
