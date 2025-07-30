import { Router } from "express";
import { PrismaClient } from "../../generated/prisma";
import { authMiddleware, CustomRequest } from "../middlewares/authMiddlewares";
import * as zod from 'zod'

const orderRoutes = Router()
const prisma = new PrismaClient()

const OrderProductsDTO = zod.array(zod.object({
    id: zod.uuid(),
    quantity: zod.int()
}))

const OrderCustomerDTO = zod.object({
    phone: zod.object({
        country_code: zod.string(),
        area_code: zod.string(),
        number: zod.string(),
    }),
    address: zod.object({
        line_1: zod.string(),
        line_2: zod.string().optional(),
        zip_code: zod.string(),
        state: zod.string(),
        city: zod.string(),
        country: zod.string(),
    }),
    name: zod.string(),
    email: zod.email(),
    document: zod.string().max(15),
})

const OrderPaymentDTO = zod.object({
    type: zod.enum(['credit_card', 'debit_card']),
    number: zod.string().length(16),
    cvv: zod.string().min(3).max(4),
    name: zod.string().optional(),
    document: zod.string().length(11).optional(),
    month: zod.int(),
    year: zod.int(),
    address: zod.object({
        line_1: zod.string(),
        line_2: zod.string(),
        zip_code: zod.string(),
        state: zod.string(),
        city: zod.string(),
        country: zod.string(),
    }).optional()
})

const OrderDTO = zod.object({
    items: OrderProductsDTO,
    customer: OrderCustomerDTO,
    payment: OrderPaymentDTO
})

orderRoutes.post('/', authMiddleware, async (req, res) => {
    const { body: _body, userInfo } = req as CustomRequest;
    const body = _body as zod.infer<typeof OrderDTO>

    try {
        OrderDTO.parse(body)
    } catch (error) {
        res.status(400).send({
            message: "Requisição inválida",
            details: zod.treeifyError(error as zod.ZodError)
        })
        return
    }

    const itemsIds = body.items
        .map(({ id }) => id)

    const products = await prisma.product.findMany({
        where: {
            id: {
                in: itemsIds
            },
        },
    })

    const items = body.items.map((item) => {
        const product = products.find((product) => product.id === item.id)
        if (!product) {
            return
        }

        return {
            code: product.id,
            amount: product.price.toNumber() * 100,
            quantity: item.quantity,
            description: product.name
        }
    })

    const gateway_body = {
        customer: {
            name: body.customer.name,
            document: body.customer.document,
            email: body.customer.email,
            type: 'individual',
            code: userInfo.id,
            phones: {
                mobile_phone: body.customer.phone
            }
        },
        items,
        payments: [
            {
                credit_card: {
                    card: {
                        billing_address: body.payment.address || body.customer.address,
                        number: body.payment.number,
                        holder_name: body.payment.name || body.customer.name,
                        holder_document: body.payment.document || body.customer.document,
                        exp_month: body.payment.month,
                        exp_year: body.payment.year,
                        cvv: body.payment.cvv
                    },
                    operation_type: "auth_and_capture"
                },
                payment_method: body.payment.type
            }
        ]
    }

    const secret = Buffer
        .from(process.env.GATEWAY_API_KEY as string + ':')
        .toString('base64')    

    const request = await fetch('https://api.pagar.me/core/v5/orders', {
        method: 'post',
        body: JSON.stringify(gateway_body),
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Basic ' + secret,
            'Content-Type': 'application/json'
        }
    })

    if (!request.ok) {
        res.status(500).send({
            message: 'Erro ao fazer o pedido',
            details: await request.json()
        })
        return
    }

    res.send({
        message: 'Pedido feito',
        details: {}
    })
})

orderRoutes.get('/', authMiddleware, async (req, res) => {
    const { userInfo, query } = req as CustomRequest;
    const { 
        page = 1,
    } = query

    const ordersRequest = await fetch(`https://api.pagar.me/core/v5/orders?customer_id=${userInfo.id}&page=${page}`)
    const orders = await ordersRequest.json()
    res.send(orders)
})

orderRoutes.post('/gateway-confirm', async (req, res) => {

})

export default orderRoutes
