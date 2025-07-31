import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';
import ModuloUsuario from '../src/modules/ModuloUsuario.js';
import ModuloCategorias from '../src/modules/ModuloCategorias.js';

describe('Endpoints routerCategorias', () => {
    let token = '';
    let email = `test${Math.floor(Math.random()*10000)}@mail.com`;
    let password = 'Test123456789';
    let categoriaId = '';

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

    // Pruebas para CrearCategoria
    it('POST /api/nuevaCategoria - crear categoría válida', async () => {
        const res = await request(app)
            .post('/api/nuevaCategoria')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: 'Plomería'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg', 'Categoría creada');
    });

    it('POST /api/nuevaCategoria - crear segunda categoría', async () => {
        const res = await request(app)
            .post('/api/nuevaCategoria')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: 'Electricidad'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg', 'Categoría creada');
    });

    it('POST /api/nuevaCategoria - crear categoría con suscripciones', async () => {
        const res = await request(app)
            .post('/api/nuevaCategoria')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: 'Limpieza',
                suscripciones: 5
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg', 'Categoría creada');
    });

    it('POST /api/nuevaCategoria - error con nombre vacío', async () => {
        const res = await request(app)
            .post('/api/nuevaCategoria')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: ''
            });
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('msg', 'Debe llenar el campo');
    });

    it('POST /api/nuevaCategoria - error sin nombre', async () => {
        const res = await request(app)
            .post('/api/nuevaCategoria')
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect([200, 404]).toContain(res.statusCode);
    });

    // Pruebas para ObtenerCategorias
    it('GET /api/listaCategorias - obtener todas las categorías', async () => {
        const res = await request(app)
            .get('/api/listaCategorias')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        
        // Guardar el ID de la primera categoría para las pruebas de eliminación
        if (res.body.length > 0) {
            categoriaId = res.body[0]._id;
        }
    });

    it('GET /api/listaCategorias - verificar estructura de categorías', async () => {
        const res = await request(app)
            .get('/api/listaCategorias')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        
        if (res.body.length > 0) {
            const categoria = res.body[0];
            expect(categoria).toHaveProperty('_id');
            expect(categoria).toHaveProperty('nombre');
            expect(categoria).toHaveProperty('suscripciones');
            expect(typeof categoria.nombre).toBe('string');
            expect(typeof categoria.suscripciones).toBe('number');
        }
    });

    // Pruebas para EliminarCategoría
    it('DELETE /api/eliminarCategoria/:id - eliminar categoría existente', async () => {
        if (!categoriaId) {
            // Si no hay categoría, crear una para eliminar
            const cat = new ModuloCategorias({ nombre: 'Categoría Temporal' });
            await cat.save();
            categoriaId = cat._id.toString();
        }

        const res = await request(app)
            .delete(`/api/eliminarCategoria/${categoriaId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg', 'Categoría eliminada');
    });

    it('DELETE /api/eliminarCategoria/:id - error con ID inexistente', async () => {
        const idInexistente = new mongoose.Types.ObjectId();
        const res = await request(app)
            .delete(`/api/eliminarCategoria/${idInexistente}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('msg', 'No existe la categoría');
    });

    it('DELETE /api/eliminarCategoria/:id - error sin ID', async () => {
        const res = await request(app)
            .delete('/api/eliminarCategoria/')
            .set('Authorization', `Bearer ${token}`);
        expect([400, 404]).toContain(res.statusCode);
    });

    it('DELETE /api/eliminarCategoria/:id - error con ID inválido', async () => {
        const res = await request(app)
            .delete('/api/eliminarCategoria/id_invalido')
            .set('Authorization', `Bearer ${token}`);
        expect([404, 500]).toContain(res.statusCode);
    });

    // Pruebas de autenticación
    it('POST /api/nuevaCategoria - error sin token de autenticación', async () => {
        const res = await request(app)
            .post('/api/nuevaCategoria')
            .send({
                nombre: 'Categoría Sin Auth'
            });
        expect(res.statusCode).toBe(404);
    });

    it('GET /api/listaCategorias - error sin token de autenticación', async () => {
        const res = await request(app)
            .get('/api/listaCategorias');
        expect(res.statusCode).toBe(404);
    });

    it('DELETE /api/eliminarCategoria/:id - error sin token de autenticación', async () => {
        const res = await request(app)
            .delete('/api/eliminarCategoria/123456789012345678901234');
        expect(res.statusCode).toBe(404);
    });

    it('POST /api/nuevaCategoria - error con token inválido', async () => {
        const res = await request(app)
            .post('/api/nuevaCategoria')
            .set('Authorization', 'Bearer token_invalido')
            .send({
                nombre: 'Categoría Token Inválido'
            });
        expect(res.statusCode).toBe(404);
    });

    // Pruebas de validación de datos
    it('POST /api/nuevaCategoria - categoría con nombre largo', async () => {
        const res = await request(app)
            .post('/api/nuevaCategoria')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: 'Servicios de Mantenimiento y Reparación de Sistemas Eléctricos y Electrónicos'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg', 'Categoría creada');
    });

    it('POST /api/nuevaCategoria - categoría con suscripciones negativas', async () => {
        const res = await request(app)
            .post('/api/nuevaCategoria')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: 'Categoría Negativa',
                suscripciones: -5
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('msg', 'Categoría creada');
    });

    // Prueba de verificación en base de datos
    it('Verificar que las categorías se guardan correctamente en la base de datos', async () => {
        const categorias = await ModuloCategorias.find();
        expect(categorias.length).toBeGreaterThan(0);
        
        const categoria = categorias[0];
        expect(categoria).toHaveProperty('nombre');
        expect(categoria).toHaveProperty('suscripciones');
        expect(typeof categoria.nombre).toBe('string');
        expect(typeof categoria.suscripciones).toBe('number');
    });

    // Prueba de múltiples operaciones
    it('Flujo completo: crear, listar y eliminar categoría', async () => {
        // Crear categoría
        const crearRes = await request(app)
            .post('/api/nuevaCategoria')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: 'Categoría Flujo Completo'
            });
        expect(crearRes.statusCode).toBe(200);

        // Listar categorías
        const listarRes = await request(app)
            .get('/api/listaCategorias')
            .set('Authorization', `Bearer ${token}`);
        expect(listarRes.statusCode).toBe(200);
        
        // Encontrar la categoría creada
        const categoriaCreada = listarRes.body.find(cat => cat.nombre === 'Categoría Flujo Completo');
        expect(categoriaCreada).toBeTruthy();

        // Eliminar categoría
        const eliminarRes = await request(app)
            .delete(`/api/eliminarCategoria/${categoriaCreada._id}`)
            .set('Authorization', `Bearer ${token}`);
        expect(eliminarRes.statusCode).toBe(200);
    });
}); 