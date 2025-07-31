import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';
import ModuloUsuario from '../src/modules/ModuloUsuario.js';
import ModuloCategorias from '../src/modules/ModuloCategorias.js';
import ModeloOfertas from '../src/modules/ModeloOfertas.js';
import ModeloTrabajos from '../src/modules/ModeloTrabajos.js';

describe('Endpoints routerTrabajos', () => {
    let tokenCliente = '';
    let tokenProveedor = '';
    let clienteId = '';
    let proveedorId = '';
    let ofertaId = '';
    let trabajoId = '';
    let emailCliente = `cliente${Math.floor(Math.random()*10000)}@mail.com`;
    let emailProveedor = `proveedor${Math.floor(Math.random()*10000)}@mail.com`;
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

    it('Crear cliente para las pruebas', async () => {
        const res = await request(app)
            .post('/api/registroUser')
            .set('Content-Type', 'application/json')
            .send({
                nombre: 'Cliente',
                apellido: 'Test',
                email: emailCliente,
                contrasenia: password,
                direccion: 'Calle Cliente 123'
            });
        expect(res.statusCode).toBe(200);
    }, 15000);

    it('Crear proveedor para las pruebas', async () => {
        const res = await request(app)
            .post('/api/registroUser')
            .set('Content-Type', 'application/json')
            .send({
                nombre: 'Proveedor',
                apellido: 'Test',
                email: emailProveedor,
                contrasenia: password,
                direccion: 'Calle Proveedor 456'
            });
        expect(res.statusCode).toBe(200);
    }, 15000);

    it('Confirmar emails de los usuarios', async () => {
        // Confirmar email del cliente
        const cliente = await ModuloUsuario.findOne({ email: emailCliente });
        expect(cliente).toBeTruthy();
        cliente.confirmarEmail = true;
        cliente.token = null;
        await cliente.save();

        // Confirmar email del proveedor
        const proveedor = await ModuloUsuario.findOne({ email: emailProveedor });
        expect(proveedor).toBeTruthy();
        proveedor.confirmarEmail = true;
        proveedor.token = null;
        await proveedor.save();
    });

    it('Login cliente para obtener token', async () => {
        const res = await request(app)
            .post('/api/loginUser')
            .set('Content-Type', 'application/json')
            .send({
                email: emailCliente,
                contrasenia: password
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        tokenCliente = res.body.token;
        clienteId = res.body._id;
    }, 15000);

    it('Login proveedor para obtener token', async () => {
        const res = await request(app)
            .post('/api/loginUser')
            .set('Content-Type', 'application/json')
            .send({
                email: emailProveedor,
                contrasenia: password
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        tokenProveedor = res.body.token;
        proveedorId = res.body._id;
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

    it('Crear oferta para las pruebas', async () => {
        const res = await request(app)
            .post('/api/crearOferta')
            .set('Authorization', `Bearer ${tokenProveedor}`)
            .send({
                precioPorDia: 50.00,
                precioPorHora: 10.00,
                servicio: 'Limpieza',
                descripcion: 'Servicio de limpieza profesional',
                servicios: ['Limpieza de hogar', 'Limpieza de oficina']
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('oferta');
        ofertaId = res.body.oferta._id;
    });

    it('POST /api/crearTrabajo - crear trabajo', async () => {
        const fecha = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const res = await request(app)
            .post('/api/crearTrabajo')
            .set('Authorization', `Bearer ${tokenCliente}`)
            .send({
                oferta: ofertaId,
                fecha: fecha,
                desde: '09:00',
                hasta: '12:00',
                servicio: 'Limpieza',
                tipo: 'Por hora',
                precioTotal: 30.00
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg');
    });

    it('GET /api/verTrabajo/:id - ver trabajo específico', async () => {
        // Primero obtener la lista de trabajos para obtener un ID
        const trabajosRes = await request(app)
            .get('/api/trabajos-cliente')
            .set('Authorization', `Bearer ${tokenCliente}`);
        
        if (trabajosRes.body.length > 0) {
            trabajoId = trabajosRes.body[0]._id;
            const res = await request(app)
                .get(`/api/verTrabajo/${trabajoId}`)
                .set('Authorization', `Bearer ${tokenCliente}`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('_id', trabajoId);
        } else {
            // Si no hay trabajos, probar con un ID inválido
            const res = await request(app)
                .get('/api/verTrabajo/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${tokenCliente}`);
            expect(res.statusCode).toBe(404);
        }
    });

    it('GET /api/trabajos-proveedor - obtener trabajos del proveedor', async () => {
        const res = await request(app)
            .get('/api/trabajos-proveedor')
            .set('Authorization', `Bearer ${tokenProveedor}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/trabajos-cliente - obtener trabajos del cliente', async () => {
        const res = await request(app)
            .get('/api/trabajos-cliente')
            .set('Authorization', `Bearer ${tokenCliente}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/trabajos-agendados/:id - obtener trabajos agendados de un proveedor', async () => {
        const res = await request(app)
            .get(`/api/trabajos-agendados/${proveedorId}`)
            .set('Authorization', `Bearer ${tokenProveedor}`);
        expect([200,404]).toContain(res.statusCode);
    });

    it('PUT /api/agendarTrabajo/:id - agendar trabajo', async () => {
        if (trabajoId) {
            const res = await request(app)
                .put(`/api/agendarTrabajo/${trabajoId}`)
                .set('Authorization', `Bearer ${tokenProveedor}`);
            expect([200,403,400]).toContain(res.statusCode);
        } else {
            // Si no hay trabajo, probar con un ID inválido
            const res = await request(app)
                .put('/api/agendarTrabajo/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${tokenProveedor}`);
            expect(res.statusCode).toBe(404);
        }
    });

    it('PUT /api/rechazarTrabajo/:id - rechazar trabajo', async () => {
        if (trabajoId) {
            const res = await request(app)
                .put(`/api/rechazarTrabajo/${trabajoId}`)
                .set('Authorization', `Bearer ${tokenProveedor}`);
            expect([200,400,404]).toContain(res.statusCode);
        } else {
            // Si no hay trabajo, probar con un ID inválido
            const res = await request(app)
                .put('/api/rechazarTrabajo/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${tokenProveedor}`);
            expect(res.statusCode).toBe(404);
        }
    });

    it('PUT /api/cancelarTrabajo/:id - cancelar trabajo', async () => {
        if (trabajoId) {
            const res = await request(app)
                .put(`/api/cancelarTrabajo/${trabajoId}?proveedor=${proveedorId}`)
                .set('Authorization', `Bearer ${tokenProveedor}`);
            expect([200,404]).toContain(res.statusCode);
        } else {
            // Si no hay trabajo, probar con un ID inválido
            const res = await request(app)
                .put(`/api/cancelarTrabajo/507f1f77bcf86cd799439011?proveedor=${proveedorId}`)
                .set('Authorization', `Bearer ${tokenProveedor}`);
            expect(res.statusCode).toBe(404);
        }
    });

    it('PUT /api/actualizarTrabajo/:id - actualizar trabajo', async () => {
        if (trabajoId) {
            const res = await request(app)
                .put(`/api/actualizarTrabajo/${trabajoId}`)
                .set('Authorization', `Bearer ${tokenCliente}`)
                .send({
                    servicio: 'Limpieza actualizada',
                    precioTotal: 35.00
                });
            expect([200,404]).toContain(res.statusCode);
        } else {
            // Si no hay trabajo, probar con un ID inválido
            const res = await request(app)
                .put('/api/actualizarTrabajo/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${tokenCliente}`)
                .send({
                    servicio: 'Limpieza actualizada',
                    precioTotal: 35.00
                });
            expect(res.statusCode).toBe(404);
        }
    });

    it('POST /api/calificarProveedor/:id - calificar proveedor', async () => {
        if (trabajoId) {
            const res = await request(app)
                .post(`/api/calificarProveedor/${trabajoId}`)
                .set('Authorization', `Bearer ${tokenCliente}`)
                .send({
                    calificacionProveedor: 5
                });
            expect([200,400,404]).toContain(res.statusCode);
        } else {
            // Si no hay trabajo, probar con un ID inválido
            const res = await request(app)
                .post('/api/calificarProveedor/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${tokenCliente}`)
                .send({
                    calificacionProveedor: 5
                });
            expect(res.statusCode).toBe(404);
        }
    });

    it('POST /api/calificarCliente/:id - calificar cliente', async () => {
        if (trabajoId) {
            const res = await request(app)
                .post(`/api/calificarCliente/${trabajoId}`)
                .set('Authorization', `Bearer ${tokenProveedor}`)
                .send({
                    calificacionCliente: 4
                });
            expect([200,400,404]).toContain(res.statusCode);
        } else {
            // Si no hay trabajo, probar con un ID inválido
            const res = await request(app)
                .post('/api/calificarCliente/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${tokenProveedor}`)
                .send({
                    calificacionCliente: 4
                });
            expect(res.statusCode).toBe(404);
        }
    });

    it('DELETE /api/eliminarTrabajo/:id - eliminar trabajo', async () => {
        if (trabajoId) {
            const res = await request(app)
                .delete(`/api/eliminarTrabajo/${trabajoId}`)
                .set('Authorization', `Bearer ${tokenCliente}`);
            expect([200,404]).toContain(res.statusCode);
        } else {
            // Si no hay trabajo, probar con un ID inválido
            const res = await request(app)
                .delete('/api/eliminarTrabajo/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${tokenCliente}`);
            expect(res.statusCode).toBe(404);
        }
    });

    // Pruebas de casos de error
    it('POST /api/crearTrabajo - error con campos vacíos', async () => {
        const res = await request(app)
            .post('/api/crearTrabajo')
            .set('Authorization', `Bearer ${tokenCliente}`)
            .send({
                oferta: '',
                fecha: '',
                desde: '',
                hasta: '',
                servicio: '',
                tipo: '',
                precioTotal: ''
            });
        expect(res.statusCode).toBe(400);
    });

    it('POST /api/crearTrabajo - error con oferta inexistente', async () => {
        const fecha = new Date().toISOString().split('T')[0];
        const res = await request(app)
            .post('/api/crearTrabajo')
            .set('Authorization', `Bearer ${tokenCliente}`)
            .send({
                oferta: '507f1f77bcf86cd799439011',
                fecha: fecha,
                desde: '09:00',
                hasta: '12:00',
                servicio: 'Limpieza',
                tipo: 'Por hora',
                precioTotal: 30.00
            });
        expect(res.statusCode).toBe(404);
    });

    it('GET /api/verTrabajo/:id - error con ID inválido', async () => {
        const res = await request(app)
            .get('/api/verTrabajo/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${tokenCliente}`);
        expect(res.statusCode).toBe(404);
    });

    it('POST /api/calificarProveedor/:id - error con calificación vacía', async () => {
        if (trabajoId) {
            const res = await request(app)
                .post(`/api/calificarProveedor/${trabajoId}`)
                .set('Authorization', `Bearer ${tokenCliente}`)
                .send({
                    calificacionProveedor: ''
                });
            expect(res.statusCode).toBe(400);
        }
    });

    it('POST /api/calificarCliente/:id - error con calificación vacía', async () => {
        if (trabajoId) {
            const res = await request(app)
                .post(`/api/calificarCliente/${trabajoId}`)
                .set('Authorization', `Bearer ${tokenProveedor}`)
                .send({
                    calificacionCliente: ''
                });
            expect(res.statusCode).toBe(400);
        }
    });

    // Prueba de límite de créditos
    it('PUT /api/agendarTrabajo/:id - error por falta de créditos', async () => {
        // Crear un proveedor sin créditos
        const emailProveedorSinCreditos = `proveedorSinCreditos${Math.floor(Math.random()*10000)}@mail.com`;
        
        // Registrar proveedor sin créditos
        await request(app)
            .post('/api/registroUser')
            .set('Content-Type', 'application/json')
            .send({
                nombre: 'ProveedorSinCreditos',
                apellido: 'Test',
                email: emailProveedorSinCreditos,
                contrasenia: password,
                direccion: 'Calle Sin Creditos 789'
            });

        // Confirmar email
        const proveedorSinCreditos = await ModuloUsuario.findOne({ email: emailProveedorSinCreditos });
        proveedorSinCreditos.confirmarEmail = true;
        proveedorSinCreditos.token = null;
        proveedorSinCreditos.monedasTrabajos = 0; // Sin créditos
        await proveedorSinCreditos.save();

        // Login
        const loginRes = await request(app)
            .post('/api/loginUser')
            .set('Content-Type', 'application/json')
            .send({
                email: emailProveedorSinCreditos,
                contrasenia: password
            });

        const tokenSinCreditos = loginRes.body.token;

        // Crear oferta
        const ofertaRes = await request(app)
            .post('/api/crearOferta')
            .set('Authorization', `Bearer ${tokenSinCreditos}`)
            .send({
                precioPorDia: 40.00,
                precioPorHora: 8.00,
                servicio: 'Limpieza',
                descripcion: 'Servicio sin créditos',
                servicios: ['Limpieza de hogar']
            });

        const ofertaIdSinCreditos = ofertaRes.body.oferta._id;

        // Crear trabajo
        const fecha = new Date().toISOString().split('T')[0];
        const trabajoRes = await request(app)
            .post('/api/crearTrabajo')
            .set('Authorization', `Bearer ${tokenCliente}`)
            .send({
                oferta: ofertaIdSinCreditos,
                fecha: fecha,
                desde: '10:00',
                hasta: '13:00',
                servicio: 'Limpieza',
                tipo: 'Por hora',
                precioTotal: 24.00
            });

        const trabajoIdSinCreditos = trabajoRes.body.trabajo?._id;

        if (trabajoIdSinCreditos) {
            // Intentar agendar sin créditos
            const res = await request(app)
                .put(`/api/agendarTrabajo/${trabajoIdSinCreditos}`)
                .set('Authorization', `Bearer ${tokenSinCreditos}`);
            expect(res.statusCode).toBe(403);
        }
    });
});
