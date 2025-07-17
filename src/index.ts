import express, { json } from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './routes/authRoutes'

const app = express()
const port = process.env.PORT || 8000;

app.use(json())
app.use(cors())

app.use('/auth', authRoutes)

app.listen(port, () => {
    console.log('Aplicação rodando na url http://localhost:' + port);
})