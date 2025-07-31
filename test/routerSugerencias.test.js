import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';
import ModuloUsuario from '../src/modules/ModuloUsuario.js';
import ModeloSugerencias from '../src/modules/ModeloSugerencias.js';

describe('Endpoints routerSugerencias', () => {
    let token = '';
    let email = `test${Math.floor(Math.random()*10000)}@mail.com`;
    let password = 'Test123456789';

    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost:27017/altakassa_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('Crear usuario para las pruebas', async () => {
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
    }, 15000);

    it('POST /api/sugerencias - crear primera sugerencia', async () => {
        const res = await request(app)
            .post('/api/sugerencias')
            .set('Authorization', `Bearer ${token}`)
            .send({
                email: email,
                nombre: 'Test User',
                experiencia: 'Excelente',
                comentarios: {
                    comentario: 'Esta es mi primera sugerencia para mejorar la plataforma'
                }
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg', 'Comentario enviado');
    });

    it('POST /api/sugerencias - agregar comentario adicional al mismo usuario', async () => {
        const res = await request(app)
            .post('/api/sugerencias')
            .set('Authorization', `Bearer ${token}`)
            .send({
                email: email,
                nombre: 'Test User',
                experiencia: 'Muy buena',
                comentarios: {
                    comentario: 'Esta es mi segunda sugerencia para mejorar la plataforma'
                }
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg', 'Comentario enviado');
    });

    it('POST /api/sugerencias - crear sugerencia con nuevo usuario', async () => {
        const nuevoEmail = `test2${Math.floor(Math.random()*10000)}@mail.com`;
        const res = await request(app)
            .post('/api/sugerencias')
            .set('Authorization', `Bearer ${token}`)
            .send({
                email: nuevoEmail,
                nombre: 'Test User 2',
                experiencia: 'Buena',
                comentarios: {
                    comentario: 'Sugerencia de un nuevo usuario'
                }
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg', 'Comentario enviado');
    });

    it('POST /api/sugerencias - actualizar experiencia existente', async () => {
        const res = await request(app)
            .post('/api/sugerencias')
            .set('Authorization', `Bearer ${token}`)
            .send({
                email: email,
                nombre: 'Test User Actualizado',
                experiencia: 'Increíble',
                comentarios: {
                    comentario: 'Actualizando mi experiencia en la plataforma'
                }
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg', 'Comentario enviado');
    });

    // Pruebas de casos de error
    it('POST /api/sugerencias - error con campos vacíos', async () => {
        const res = await request(app)
            .post('/api/sugerencias')
            .set('Authorization', `Bearer ${token}`)
            .send({
                email: '',
                nombre: '',
                experiencia: '',
                comentarios: {
                    comentario: ''
                }
            });
        expect(res.statusCode).toBe(404);
    });

    it('POST /api/sugerencias - error sin comentario', async () => {
        const res = await request(app)
            .post('/api/sugerencias')
            .set('Authorization', `Bearer ${token}`)
            .send({
                email: `test5${Math.floor(Math.random()*10000)}@mail.com`,
                nombre: 'Test User',
                experiencia: 'Buena',
                comentarios: {
                    comentario: ''
                }
            });
        expect([404, 500]).toContain(res.statusCode);
    });

    // Pruebas de validación de datos
    it('POST /api/sugerencias - sugerencia con datos válidos', async () => {
        const res = await request(app)
            .post('/api/sugerencias')
            .set('Authorization', `Bearer ${token}`)
            .send({
                email: `test6${Math.floor(Math.random()*10000)}@mail.com`,
                nombre: 'Usuario Válido',
                experiencia: 'Muy satisfecho con el servicio',
                comentarios: {
                    comentario: 'Excelente plataforma, muy fácil de usar y los servicios son de calidad.'
                }
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg', 'Comentario enviado');
    });

    // Prueba de múltiples comentarios para el mismo usuario
    it('POST /api/sugerencias - múltiples comentarios para el mismo usuario', async () => {
        const emailMultiples = `testMultiples${Math.floor(Math.random()*10000)}@mail.com`;
        
        // Primer comentario
        const res1 = await request(app)
            .post('/api/sugerencias')
            .set('Authorization', `Bearer ${token}`)
            .send({
                email: emailMultiples,
                nombre: 'Usuario Múltiples',
                experiencia: 'Excelente',
                comentarios: {
                    comentario: 'Primer comentario: La plataforma es muy intuitiva'
                }
            });
        expect(res1.statusCode).toBe(200);

        // Segundo comentario
        const res2 = await request(app)
            .post('/api/sugerencias')
            .set('Authorization', `Bearer ${token}`)
            .send({
                email: emailMultiples,
                nombre: 'Usuario Múltiples',
                experiencia: 'Muy buena',
                comentarios: {
                    comentario: 'Segundo comentario: Los precios son competitivos'
                }
            });
        expect(res2.statusCode).toBe(200);
    });

    // Prueba de verificación en base de datos
    it('Verificar que las sugerencias se guardan correctamente en la base de datos', async () => {
        const sugerencias = await ModeloSugerencias.find({ email: email });
        expect(sugerencias.length).toBeGreaterThan(0);
        
        const sugerencia = sugerencias[0];
        expect(sugerencia).toHaveProperty('email', email);
        expect(sugerencia).toHaveProperty('nombre');
        expect(sugerencia).toHaveProperty('experiencia');
        expect(sugerencia).toHaveProperty('comentarios');
        expect(Array.isArray(sugerencia.comentarios)).toBe(true);
        expect(sugerencia.comentarios.length).toBeGreaterThan(0);
    });

    // Prueba de error sin autenticación
    it('POST /api/sugerencias - error sin token de autenticación', async () => {
        const res = await request(app)
            .post('/api/sugerencias')
            .send({
                email: `testNoAuth${Math.floor(Math.random()*10000)}@mail.com`,
                nombre: 'Usuario Sin Auth',
                experiencia: 'Buena',
                comentarios: {
                    comentario: 'Sugerencia sin autenticación'
                }
            });
        expect(res.statusCode).toBe(404);
    });

    // Prueba de error con token inválido
    it('POST /api/sugerencias - error con token inválido', async () => {
        const res = await request(app)
            .post('/api/sugerencias')
            .set('Authorization', 'Bearer token_invalido')
            .send({
                email: `testTokenInvalido${Math.floor(Math.random()*10000)}@mail.com`,
                nombre: 'Usuario Token Inválido',
                experiencia: 'Buena',
                comentarios: {
                    comentario: 'Sugerencia con token inválido'
                }
            });
        expect(res.statusCode).toBe(404);
    });
}); 