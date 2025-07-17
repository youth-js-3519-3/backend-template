import { Router } from "express";
import { PrismaClient } from "../../generated/prisma";

const productRoutes = Router();
const prisma = new PrismaClient();

productRoutes.post('/')

export default productRoutes;