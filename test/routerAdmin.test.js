import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';
import ModeloAdmin from '../src/modules/ModeloAdmin.js';

describe('Endpoints routerAdmin', () => {
    let token = '';
    let adminId = '';
    let email = `admin${Math.floor(Math.random()*10000)}@mail.com`;
    let password = 'Admin123456789'; // 12 caracteres para cumplir validación

    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost:27017/altakassa_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('POST /api/registro - registro de administrador', async () => {
        const res = await request(app)
            .post('/api/registro')
            .set('Content-Type', 'application/json')
            .send({
                nombre: 'Admin',
                apellido: 'Test',
                email,
                contrasenia: password,
                direccion: 'Calle Admin 123',
                telefono: '0999999999'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg');
        expect(res.body).toHaveProperty('rol');
    }, 15000);

    it('Confirmar email del administrador', async () => {
        // Buscar el admin recién registrado y confirmar su email
        const admin = await ModeloAdmin.findOne({ email });
        expect(admin).toBeTruthy();
        
        // Confirmar el email directamente en la base de datos
        admin.confirmEmail = true;
        admin.token = null;
        await admin.save();
    });

    it('POST /api/login - login administrador', async () => {
        const res = await request(app)
            .post('/api/login')
            .set('Content-Type', 'application/json')
            .send({
                email,
                contrasenia: password
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('_id');
        expect(res.body).toHaveProperty('rol', 'administrador');
        token = res.body.token;
        adminId = res.body._id;
    }, 15000);

    it('GET /api/perfil-admin - perfil administrador', async () => {
        const res = await request(app)
            .get('/api/perfil-admin')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('email', email);
    });

    it('PUT /api/actualizar-perfil - actualizar perfil administrador', async () => {
        const res = await request(app)
            .put('/api/actualizar-perfil')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: 'AdminEdit',
                apellido: 'TestEdit',
                direccion: 'Nueva Direccion Admin'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg');
    });

    it('PUT /api/actualizar-contrasenia - actualizar contraseña administrador', async () => {
        const res = await request(app)
            .put('/api/actualizar-contrasenia')
            .set('Authorization', `Bearer ${token}`)
            .send({
                contrasenia: password,
                nuevaContrasenia: 'NuevaAdmin123456'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg');
        password = 'NuevaAdmin123456';
    });

    it('POST /api/fotoAdmin - subida de foto administrador', async () => {
        const res = await request(app)
            .post('/api/fotoAdmin')
            .set('Authorization', `Bearer ${token}`)
            .send({ secure_url: 'https://fakeurl.com/admin-foto.jpg' });
        expect([200,404]).toContain(res.statusCode);
    });

    it('POST /api/crearPlan - crear plan', async () => {
        const res = await request(app)
            .post('/api/crearPlan')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: 'Plan Test',
                precio: 29.99,
                creditos: 10,
                descripcion: 'Plan de prueba para testing'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg');
        expect(res.body).toHaveProperty('plan');
    });

    it('GET /api/obtenerPlanes - obtener planes', async () => {
        const res = await request(app)
            .get('/api/obtenerPlanes')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/obtenerPlan/:id - obtener plan específico', async () => {
        // Primero obtener la lista de planes para obtener un ID
        const planesRes = await request(app)
            .get('/api/obtenerPlanes')
            .set('Authorization', `Bearer ${token}`);
        
        if (planesRes.body.length > 0) {
            const planId = planesRes.body[0]._id;
            const res = await request(app)
                .get(`/api/obtenerPlan/${planId}`)
                .set('Authorization', `Bearer ${token}`);
            expect([200,404]).toContain(res.statusCode);
        } else {
            // Si no hay planes, probar con un ID inválido
            const res = await request(app)
                .get('/api/obtenerPlan/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(404);
        }
    });

    it('PUT /api/actualizarPlan/:id - actualizar plan', async () => {
        // Primero obtener la lista de planes para obtener un ID
        const planesRes = await request(app)
            .get('/api/obtenerPlanes')
            .set('Authorization', `Bearer ${token}`);
        
        if (planesRes.body.length > 0) {
            const planId = planesRes.body[0]._id;
            const res = await request(app)
                .put(`/api/actualizarPlan/${planId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nombre: 'Plan Actualizado',
                    precio: 39.99,
                    creditos: 15,
                    descripcion: 'Plan actualizado para testing'
                });
            expect([200,404]).toContain(res.statusCode);
        } else {
            // Si no hay planes, probar con un ID inválido
            const res = await request(app)
                .put('/api/actualizarPlan/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nombre: 'Plan Actualizado',
                    precio: 39.99,
                    creditos: 15,
                    descripcion: 'Plan actualizado para testing'
                });
            expect(res.statusCode).toBe(404);
        }
    });

    it('DELETE /api/eliminarPlan/:id - eliminar plan', async () => {
        // Primero obtener la lista de planes para obtener un ID
        const planesRes = await request(app)
            .get('/api/obtenerPlanes')
            .set('Authorization', `Bearer ${token}`);
        
        if (planesRes.body.length > 0) {
            const planId = planesRes.body[0]._id;
            const res = await request(app)
                .delete(`/api/eliminarPlan/${planId}`)
                .set('Authorization', `Bearer ${token}`);
            expect([200,404]).toContain(res.statusCode);
        } else {
            // Si no hay planes, probar con un ID inválido
            const res = await request(app)
                .delete('/api/eliminarPlan/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(404);
        }
    });

    it('GET /api/listarUsuarios - listar usuarios', async () => {
        const res = await request(app)
            .get('/api/listarUsuarios')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/detalleUsers/:id - detalles de usuario específico', async () => {
        // Primero obtener la lista de usuarios para obtener un ID
        const usuariosRes = await request(app)
            .get('/api/listarUsuarios')
            .set('Authorization', `Bearer ${token}`);
        
        if (usuariosRes.body.length > 0) {
            const userId = usuariosRes.body[0]._id;
            const res = await request(app)
                .get(`/api/detalleUsers/${userId}`)
                .set('Authorization', `Bearer ${token}`);
            expect([200,404]).toContain(res.statusCode);
        } else {
            // Si no hay usuarios, probar con un ID inválido
            const res = await request(app)
                .get('/api/detalleUsers/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(404);
        }
    });

    it('DELETE /api/eliminarUser/:id - eliminar usuario', async () => {
        // Primero obtener la lista de usuarios para obtener un ID
        const usuariosRes = await request(app)
            .get('/api/listarUsuarios')
            .set('Authorization', `Bearer ${token}`);
        
        if (usuariosRes.body.length > 0) {
            const userId = usuariosRes.body[0]._id;
            const res = await request(app)
                .delete(`/api/eliminarUser/${userId}`)
                .set('Authorization', `Bearer ${token}`);
            expect([200,404]).toContain(res.statusCode);
        } else {
            // Si no hay usuarios, probar con un ID inválido
            const res = await request(app)
                .delete('/api/eliminarUser/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(404);
        }
    });

    it('GET /api/verSugerencias - ver sugerencias', async () => {
        const res = await request(app)
            .get('/api/verSugerencias')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/sugerenciasPorUsuario/:id - sugerencias por usuario', async () => {
        // Primero obtener la lista de usuarios para obtener un ID
        const usuariosRes = await request(app)
            .get('/api/listarUsuarios')
            .set('Authorization', `Bearer ${token}`);
        
        if (usuariosRes.body.length > 0) {
            const userId = usuariosRes.body[0]._id;
            const res = await request(app)
                .get(`/api/sugerenciasPorUsuario/${userId}`)
                .set('Authorization', `Bearer ${token}`);
            expect([200,404]).toContain(res.statusCode);
        } else {
            // Si no hay usuarios, probar con un ID inválido
            const res = await request(app)
                .get('/api/sugerenciasPorUsuario/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(404);
        }
    });

    // Pruebas para endpoints públicos
    it('POST /api/recuperar-contrasenia - recuperar contraseña', async () => {
        const res = await request(app)
            .post('/api/recuperar-contrasenia')
            .set('Content-Type', 'application/json')
            .send({ email });
        expect([200,404]).toContain(res.statusCode);
    });

    it('GET /api/restablecer-contrasenia/:token - restablecer contraseña', async () => {
        const res = await request(app)
            .get('/api/restablecer-contrasenia/fake-token')
            .set('Content-Type', 'application/json');
        expect([200,404]).toContain(res.statusCode);
    });
});
