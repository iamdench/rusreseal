var index = require('../serv');

var should = require('should'),
    supertest = require('supertest')

describe('Тесты', function(){
    var Cookies;
    var Cookies2;

    it('Проверка подключения к БД', function(done){
        supertest('https://resaler.herokuapp.com')
            .get('/isDbConnected')
            .expect(200)
            .end(function(err, res){
                res.status.should.equal(200);
                done();
            });

    });

    it('Открытие главной страницы', function(done){
        supertest('https://resaler.herokuapp.com')
            .get('/')
            .expect(200)
            .end(function(err, res){
                res.status.should.equal(200);
                done();
            });

    });

    it('Открытие страницы входа', function(done){
        supertest('https://resaler.herokuapp.com')
            .get('/log')
            .expect(200)
            .end(function(err, res){
                res.status.should.equal(200);
                done();
            });

    });

    it('Открытие первого лота', function(done){
        supertest('https://resaler.herokuapp.com')
            .get('/auction/12/')
            .expect(200)
            .end(function(err, res){
                res.status.should.equal(200);
                done();
            });

    });

    it('Вход в систему c верным логином и паролем', function(done){
        supertest('https://resaler.herokuapp.com')
            .post('/login')
            .type('form')
            .field('email', 'damir@mail.ru')
            .field('password', '12345')
            .expect(200)
            .end(function(err, res){
                Cookies = res.headers['set-cookie'];
                res.header['location'].should.equal('/');
                done();
            });

    });

    it('Вход в систему админом', function(done){
        supertest('https://resaler.herokuapp.com')
            .post('/login')
            .type('form')
            .field('email', 'egor@mail.ru')
            .field('password', 'qazzaq')
            .expect(200)
            .end(function(err, res){
                Cookies2 = res.headers['set-cookie'];
                res.header['location'].should.equal('/');
                done();
            });

    });

    it('Вход в систему с неверным логином', function(done){
        supertest('https://resaler.herokuapp.com')
            .post('/login')
            .type('form')
            .field('email', 'damir@mail')
            .field('password', '12345')
            .expect(200)
            .end(function(err, res){
                res.status.should.equal(200);
                done();
            });

    });

    it('Вход в систему с неверным паролем', function(done){
        supertest('https://resaler.herokuapp.com')
            .post('/login')
            .type('form')
            .field('email', 'egor@mail.ru')
            .field('password', 'qazza')
            .expect(200)
            .end(function(err, res){
                res.status.should.equal(200);
                done();
            });

    });

    it('Регистрация пользователя с неверными данными', function(done){
        supertest('https://resaler.herokuapp.com')
            .post('/signin')
            .type('form')
            .field('name', 'adasd')
            .field('link', 'qazza')
            .field('email', 'egor@mail.ru')
            .field('password', '123456Zz')
            .expect(200)
            .end(function(err, res){
                res.status.should.equal(200);
                done();
            });

    });

    it('Попытка перейти в Мои объявления неавторизованному пользователю', function(done){
        var req = supertest('https://resaler.herokuapp.com').get('/filter/my/')
        req.set('Accept', 'application/json')
            .expect(200)
            .end(function(err, res){
                res.header['location'].should.equal('/');
                done();
            });

    });

    it('Переход в Мои объявления авторизованным пользователем', function(done){
        var req = supertest('https://resaler.herokuapp.com').get('/filter/my/')
        req.cookies = Cookies2;
        req.set('Accept', 'application/json')
            .expect(200)
            .end(function(err, res){
                res.status.should.equal(200);
                done();
            });

    });

    it('Попытка перейти в раздел админа обычным пользователем', function(done){
        var req = supertest('https://resaler.herokuapp.com').get('/admin')
        req.cookies = Cookies;
        req.set('Accept', 'application/json')
            .expect(200)
            .end(function(err, res){
                res.header['location'].should.equal('/');
                done();
            });

    });

    it('Переход в раздел админа', function(done){
        var req = supertest('https://resaler.herokuapp.com').get('/admin')
        req.cookies = Cookies2;
        req.set('Accept', 'application/json')
            .expect(200)
            .end(function(err, res){
                res.status.should.equal(200);
                done();
            });

    });

    it('Написание отзыва авторизованным пользователем', function(done){
        var req = supertest('https://resaler.herokuapp.com').post('/feedback')
        req.cookies = Cookies;
        req.set('Accept', 'application/json')
            .type('form')
            .field('score', '3')
            .field('feedback', 'отзыв')
            .field('user_id', '1')
            .expect(200)
            .end(function(err, res){
                res.header['location'].should.equal('/');
                done();
            });

    });

});