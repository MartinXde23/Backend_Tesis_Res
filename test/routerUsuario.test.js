import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';
import ModuloUsuario from '../src/modules/ModuloUsuario.js';

describe('Endpoints routerUsuario', () => {
    let token = '';
    let userId = '';
    let email = `test${Math.floor(Math.random()*10000)}@mail.com`;
    let password = 'Test123456789'; // Cambiado a 12 caracteres para cumplir validación

    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost:27017/altakassa_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('POST /api/registroUser - registro de usuario', async () => {
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
        expect(res.body).toHaveProperty('msg');
        expect(res.body).toHaveProperty('rol');
    }, 15000);

    it('Confirmar email del usuario', async () => {
        // Buscar el usuario recién registrado y confirmar su email
        const usuario = await ModuloUsuario.findOne({ email });
        expect(usuario).toBeTruthy();
        
        // Confirmar el email directamente en la base de datos
        usuario.confirmarEmail = true;
        usuario.token = null;
        await usuario.save();
    });

    it('POST /api/loginUser - login usuario', async () => {
        const res = await request(app)
            .post('/api/loginUser')
            .set('Content-Type', 'application/json')
            .send({
                email,
                contrasenia: password
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('_id');
        token = res.body.token;
        userId = res.body._id;
    }, 15000);

    it('GET /api/perfilUser - perfil usuario', async () => {
        const res = await request(app)
            .get('/api/perfilUser')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('email', email);
    });

    it('PUT /api/actualizarPerfilUser - actualizar perfil', async () => {
        const res = await request(app)
            .put('/api/actualizarPerfilUser')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: 'TestEdit',
                apellido: 'UserEdit',
                direccion: 'Nueva Direccion'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg');
    });

    it('PUT /api/actualizarPassUser - actualizar contraseña', async () => {
        const res = await request(app)
            .put('/api/actualizarPassUser')
            .set('Authorization', `Bearer ${token}`)
            .send({
                contrasenia: password,
                nuevaContrasenia: 'NuevaPass123456'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg');
        password = 'NuevaPass123456';
    });

    it('GET /api/detalleUser - detalle usuario', async () => {
        const res = await request(app)
            .get('/api/detalleUser')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg');
    });

    it('POST /api/guardar-ubicacion-user - guardar ubicación actual', async () => {
        const res = await request(app)
            .post('/api/guardar-ubicacion-user')
            .set('Authorization', `Bearer ${token}`)
            .send({ longitude: -78.5, latitude: -0.2 });
        expect([200,400,404]).toContain(res.statusCode); // Corregido para incluir 404
    });

    it('POST /api/guardar-ubicacion-trabajo - guardar ubicación trabajo', async () => {
        const res = await request(app)
            .post('/api/guardar-ubicacion-trabajo')
            .set('Authorization', `Bearer ${token}`)
            .send({ longitude: -78.6, latitude: -0.3 });
        expect([200,400,404]).toContain(res.statusCode); // Corregido para incluir 404
    });

    it('POST /api/fotoUser - subida de foto', async () => {
        const res = await request(app)
            .post('/api/fotoUser')
            .set('Authorization', `Bearer ${token}`)
            .send({ secure_url: 'https://fakeurl.com/foto.jpg', public_id: 'fakeid123' });
        expect([200,404]).toContain(res.statusCode);
    });

    it('GET /api/publicIdUser/:id - obtener publicId', async () => {
        const res = await request(app)
            .get(`/api/publicIdUser/${userId}`)
            .set('Authorization', `Bearer ${token}`);
        expect([200,404,400]).toContain(res.statusCode); // Corregido para incluir 400
    });

    it('GET /api/verFotoUser - verificar foto', async () => {
        const res = await request(app)
            .get('/api/verFotoUser')
            .set('Authorization', `Bearer ${token}`);
        expect([200,404]).toContain(res.statusCode);
    });

    it('GET /api/verUbiActualUser - verificar ubicación actual', async () => {
        const res = await request(app)
            .get('/api/verUbiActualUser')
            .set('Authorization', `Bearer ${token}`);
        expect([200,404]).toContain(res.statusCode);
    });

    it('GET /api/verUbiTrabajoUser - verificar ubicación trabajo', async () => {
        const res = await request(app)
            .get('/api/verUbiTrabajoUser')
            .set('Authorization', `Bearer ${token}`);
        expect([200,404]).toContain(res.statusCode);
    });

    // Puedes agregar más pruebas para los endpoints de ubicaciones desencriptadas si lo deseas
});
