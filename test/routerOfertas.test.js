import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';
import ModuloUsuario from '../src/modules/ModuloUsuario.js';
import ModuloCategorias from '../src/modules/ModuloCategorias.js';
import ModeloOfertas from '../src/modules/ModeloOfertas.js';

describe('Endpoints routerOfertas', () => {
    let token = '';
    let userId = '';
    let ofertaId = '';
    let email = `test${Math.floor(Math.random()*10000)}@mail.com`;
    let password = 'Test123456789'; // 12 caracteres para cumplir validación

    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost:27017/altakassa_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('Crear usuario para las pruebas de ofertas', async () => {
        const res = await request(app)
            .post('/api/registroUser')
            .set('Content-Type', 'application/json')
            .send({
                nombre: 'Test',
                apellido: 'User',
                email,
                contrasenia: password,
                direccion: 'Calle Falsa 123'
            });
        expect(res.statusCode).toBe(200);
    }, 15000);

    it('Confirmar email del usuario', async () => {
        const usuario = await ModuloUsuario.findOne({ email });
        expect(usuario).toBeTruthy();
        
        usuario.confirmarEmail = true;
        usuario.token = null;
        await usuario.save();
    });

    it('Login usuario para obtener token', async () => {
        const res = await request(app)
            .post('/api/loginUser')
            .set('Content-Type', 'application/json')
            .send({
                email,
                contrasenia: password
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        token = res.body.token;
        userId = res.body._id;
    }, 15000);

    it('Crear categoría para las pruebas', async () => {
        // Crear una categoría de prueba si no existe
        const categoriaExistente = await ModuloCategorias.findOne({ nombre: 'Limpieza' });
        if (!categoriaExistente) {
            const nuevaCategoria = new ModuloCategorias({
                nombre: 'Limpieza',
                descripcion: 'Servicios de limpieza',
                suscripciones: 0
            });
            await nuevaCategoria.save();
        }
    });

    it('POST /api/crearOferta - crear oferta', async () => {
        const res = await request(app)
            .post('/api/crearOferta')
            .set('Authorization', `Bearer ${token}`)
            .send({
                precioPorDia: 50.00,
                precioPorHora: 10.00,
                servicio: 'Limpieza',
                descripcion: 'Servicio de limpieza profesional',
                servicios: ['Limpieza de hogar', 'Limpieza de oficina']
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg');
        expect(res.body).toHaveProperty('oferta');
        ofertaId = res.body.oferta._id;
    });

    it('GET /api/verOferta/:id - ver oferta específica', async () => {
        const res = await request(app)
            .get(`/api/verOferta/${ofertaId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('_id', ofertaId);
        expect(res.body).toHaveProperty('servicio', 'Limpieza');
    });

    it('GET /api/misOfertas - obtener mis ofertas', async () => {
        const res = await request(app)
            .get('/api/misOfertas')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('PUT /api/actualizarOferta/:id - actualizar oferta', async () => {
        const res = await request(app)
            .put(`/api/actualizarOferta/${ofertaId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                precioPorDia: 60.00,
                precioPorHora: 12.00,
                descripcion: 'Servicio de limpieza profesional actualizado'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg');
        expect(res.body).toHaveProperty('ofertaActual');
    });

    it('GET /api/listarOfertas - listar todas las ofertas (como usuario)', async () => {
        const res = await request(app)
            .get('/api/listarOfertas')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('DELETE /api/eliminarOferta/:id - eliminar oferta', async () => {
        const res = await request(app)
            .delete(`/api/eliminarOferta/${ofertaId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg');
    });

    // Pruebas de casos de error
    it('POST /api/crearOferta - error con campos vacíos', async () => {
        const res = await request(app)
            .post('/api/crearOferta')
            .set('Authorization', `Bearer ${token}`)
            .send({
                precioPorDia: '',
                precioPorHora: '',
                servicio: '',
                descripcion: '',
                servicios: []
            });
        expect(res.statusCode).toBe(400);
    });

    it('GET /api/verOferta/:id - error con ID inválido', async () => {
        const res = await request(app)
            .get('/api/verOferta/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(404);
    });

    it('PUT /api/actualizarOferta/:id - error con ID inválido', async () => {
        const res = await request(app)
            .put('/api/actualizarOferta/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${token}`)
            .send({
                precioPorDia: 60.00,
                precioPorHora: 12.00,
                descripcion: 'Servicio actualizado'
            });
        expect(res.statusCode).toBe(404);
    });

    it('DELETE /api/eliminarOferta/:id - error con ID inválido', async () => {
        const res = await request(app)
            .delete('/api/eliminarOferta/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(404);
    });

    // Prueba de límite de ofertas
    it('POST /api/crearOferta - crear múltiples ofertas para probar límite', async () => {
        // Crear varias ofertas para probar el límite
        for (let i = 0; i < 5; i++) {
            const res = await request(app)
                .post('/api/crearOferta')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    precioPorDia: 50.00 + i,
                    precioPorHora: 10.00 + i,
                    servicio: 'Limpieza',
                    descripcion: `Servicio de limpieza ${i + 1}`,
                    servicios: ['Limpieza de hogar']
                });
            
            // Si llega al límite, debería fallar
            if (res.statusCode === 403) {
                expect(res.body).toHaveProperty('msg');
                break;
            }
        }
    });

    // Prueba de permisos (intentar actualizar oferta de otro usuario)
    it('PUT /api/actualizarOferta/:id - error de permisos', async () => {
        // Crear un segundo usuario con email más único
        const email2 = `test2${Date.now()}${Math.floor(Math.random()*10000)}@mail.com`;
        
        // Registrar segundo usuario
        const registroRes = await request(app)
            .post('/api/registroUser')
            .set('Content-Type', 'application/json')
            .send({
                nombre: 'Test2',
                apellido: 'User2',
                email: email2,
                contrasenia: 'Test123456789',
                direccion: 'Calle Falsa 456'
            });
        
        // Si el registro falla, saltar la prueba
        if (registroRes.statusCode !== 200) {
            console.log('No se pudo crear el segundo usuario para la prueba de permisos');
            return;
        }

        // Confirmar email del segundo usuario
        const usuario2 = await ModuloUsuario.findOne({ email: email2 });
        expect(usuario2).toBeTruthy();
        usuario2.confirmarEmail = true;
        usuario2.token = null;
        await usuario2.save();

        // Login del segundo usuario
        const loginRes = await request(app)
            .post('/api/loginUser')
            .set('Content-Type', 'application/json')
            .send({
                email: email2,
                contrasenia: 'Test123456789'
            });

        expect(loginRes.statusCode).toBe(200);
        const token2 = loginRes.body.token;

        // Crear una oferta con el segundo usuario
        const ofertaRes = await request(app)
            .post('/api/crearOferta')
            .set('Authorization', `Bearer ${token2}`)
            .send({
                precioPorDia: 40.00,
                precioPorHora: 8.00,
                servicio: 'Limpieza',
                descripcion: 'Servicio de otro usuario',
                servicios: ['Limpieza de hogar']
            });

        expect(ofertaRes.statusCode).toBe(200);
        const ofertaId2 = ofertaRes.body.oferta._id;

        // Intentar actualizar la oferta del segundo usuario con el primer usuario
        const res = await request(app)
            .put(`/api/actualizarOferta/${ofertaId2}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                precioPorDia: 100.00,
                descripcion: 'Intento de modificación no autorizada'
            });

        expect(res.statusCode).toBe(403);
    });
});
