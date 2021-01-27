

// Подключение библиотек -------------------------------------------------------------------------------

var express = require('express');
require('dotenv').load();
var Pusher = require('pusher');
var path = require('path');
var bodyParser = require("body-parser");
var fs = require("fs");
var upload = require("express-fileupload");
const pg  = require('pg');
var cookieParser = require('cookie-parser');
var bcrypt = require('bcrypt');

var app = express();

app.use(cookieParser());



const config = {
    host: process.env.HOST,
    database: process.env.DATABASE,
    user: process.env.NAME,
    password: process.env.PASS,
    port: 5432,
    ssl: true
};

const pool = new pg.Pool(config);

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use('/auction/:id/',express.static(__dirname + '/public'));
app.use('/ok/:id/',express.static(__dirname + '/public'));
app.use('/no/:id/',express.static(__dirname + '/public'));
app.use('/filter/:id/',express.static(__dirname + '/public'));

app.use(upload());


// -------------------------------------------------------------------------------------------------------


// Проверка на подключение к БД --------------------------------------------------------------------------

app.get('/isDbConnected', function(req, res) {
  pool.connect(function (err, client, done) {
    if (err) {
        done();
           res.sendStatus(400);
       }
    else {
      done();
      res.sendStatus(200);
    }
  })
});

// ------------------------------------------------------------------------------------------------------


// Запрос для перехода на главную страницу --------------------------------------------------------------


app.get('/', function(req, res) {
  pool.connect(function (err, client, done) {
       if (err) {
           console.log("Can not connect to the DB" + err);
       }
       client.query('select lots.lot_id, images.img_id, images.img_name, lots.model, lots.price, brands.brand ' +
                    'from lots, images, brands ' +
                    'where lots.lot_id = images.lot_id ' +
                    'and images.ismain = true ' +
                    'and lots.permiss = true ' +
                    'and lots.brand_id = brands.brand_id;', function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            if (req.cookies.name == undefined) {
              res.render('index', {catalogJSON : JSON.stringify(result.rows), info : '', money : '', value : '', main : true});
            }
            else {
                res.render('index', {catalogJSON : JSON.stringify(result.rows), info : req.cookies.name, money : req.cookies.cash, value : req.cookies.value, main : true});
            }
       })
   })
});


app.get('/admin', function(req, res) {
  if (req.cookies.value == 'true') {
      pool.connect(function (err, client, done) {
       if (err) {
           console.log("Can not connect to the DB" + err);
       }
       client.query('select * from lots, images where lots.lot_id = images.lot_id and images.ismain = true and lots.permiss = false;', function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            var catalog = result.rows;
            var catalogJSON = JSON.stringify(catalog);
            if (req.cookies.name == undefined) {
              res.render('index', {catalogJSON : catalogJSON, info : '', money : '', value : '', main : true});
            }
            else {
                res.render('index', {catalogJSON : catalogJSON, info : req.cookies.name, money : req.cookies.cash, value : req.cookies.value, main : false});
            }
       })
   })
  }
  else res.redirect('/');
});

app.get('/filter/:id', function(req, res) {
  if (req.params.id != 'my') {
    if (Number(req.params.id) == 0) {
      var gender = true;
    }
    else {
      var gender = false;
    }
    pool.connect(function (err, client, done) {
         if (err) {
             console.log("Can not connect to the DB" + err);
         }
         client.query('select lots.lot_id, images.img_id, images.img_name, lots.model, lots.price, brands.brand ' + 
                      'from lots, images, brands ' +
                      'where lots.lot_id = images.lot_id ' +
                      'and images.ismain = true ' +
                      'and lots.permiss = true ' +
                      'and lots.brand_id = brands.brand_id ' +
                      'and lots.gender = $1;', [gender], function (err, result) {
              done();
              if (err) {
                  console.log(err);
                  res.status(400).send(err);
              }
              if (req.cookies.name == undefined) {
                res.render('index', {catalogJSON : JSON.stringify(result.rows), info : '', money : '', value : '', main : true});
              }
              else {
                  res.render('index', {catalogJSON : JSON.stringify(result.rows), info : req.cookies.name, money : req.cookies.cash, value : req.cookies.value, main : true});
              }
         })
     })
  }
  else {
    if (req.cookies.name == undefined) {
                res.redirect('/');
              }
    else {
    pool.connect(function (err, client, done) {
         if (err) {
             console.log("Can not connect to the DB" + err);
         }
         client.query('select lots.lot_id, images.img_id, images.img_name, lots.model, lots.price, brands.brand ' + 
                      'from lots, images, brands ' +
                      'where lots.lot_id = images.lot_id ' +
                      'and images.ismain = true ' +
                      'and lots.permiss = true ' +
                      'and lots.brand_id = brands.brand_id ' +
                      'and lots.user_id = $1;', [req.cookies.user_id], function (err, result) {
              done();
              if (err) {
                  console.log(err);
                  res.status(400).send(err);
              }
                  res.render('index', {catalogJSON : JSON.stringify(result.rows), info : req.cookies.name, money : req.cookies.cash, value : req.cookies.value, main : 'my'});
              
         })
     })
  }
  }
});

// -------------------------------------------------------------------------------------------------------


// Вход, выход и регистрация в системе -------------------------------------------------------------------


app.get('/out', function(req, res) {
  res.clearCookie('name');
  res.clearCookie('user_id');
  res.clearCookie('cash');
  res.clearCookie('value');
  res.redirect('/');
});

app.get('/log', function(req, res) {
  res.render('log', {mess : ''});
});

app.get('/sign', function(req, res) {
  res.render('sign', {mess : ''});
});


app.post('/login', urlencodedParser, function(req, res) {
  pool.connect(function (err, client, done) {
    client.query('select * from users where users.login = $1 and users.pass = $2', [req.body.email, bcrypt.hashSync(req.body.password, process.env.SALT)], function (err, result) {

        done()
        if (result.rows.length == 0) {
            res.render('log', {mess : 'Логин или пароль введены неверно'});
        }
        else {
            res.cookie('user_id', result.rows[0].user_id, {expires: new Date(Date.now() + 3000000), httpOnly: true});
            res.cookie('name', result.rows[0].name, {expires: new Date(Date.now() + 3000000), httpOnly: true});
            res.cookie('cash', result.rows[0].cash, {expires: new Date(Date.now() + 3000000), httpOnly: true});
            res.cookie('value', result.rows[0].admin, {expires: new Date(Date.now() + 3000000), httpOnly: true});
            //console.log(req.cookies);
            res.redirect('/');
        }
    })
  })
});


app.post('/signin', urlencodedParser, function(req, res) {
  if ((req.body.password == req.body.password.match(/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}/g)[0]) && (req.body.name == req.body.name.match(/[a-zA-Z]{1,}/g)[0])) {
    pool.connect(function (err, client, done) {
      client.query('select login from users where users.login = $1', [req.body.email], function (err, result) {
        done()
          if (result.rows.length == 0) {
              client.query('INSERT INTO users(name, login, link, cash, pass, admin) VALUES($1, $2, $3, $4, $5, $6);', [req.body.name, req.body.email, req.body.link, 2500, bcrypt.hashSync(req.body.password, process.env.SALT), false], function (err, result) {
                res.redirect('/');
                  })
          }
          else {
            res.render('sign', {mess : 'Пользователь с таким email уже существует'});
          }
      })
    })
  }
  else {
    res.render('sign', {mess : 'Неверный формат данных'});
  }
});


// ------------------------------------------------------------------------------------------------------


// Функционал опубликовки объявления --------------------------------------------------------------------


app.get('/sell', function(req, res) {
  if (req.cookies.user_id == undefined) {
    res.redirect('/sign');
  }
  else {
      pool.connect(function (err, client, done) {
        client.query('select * from cities;', function (err, result) {
            var cities = result.rows; 
            client.query('select * from sizes;', function (err, result) {
                var sizes = result.rows; 
                client.query('select * from conditions;', function (err, result) {
                  var conditions = result.rows;  
                  client.query('select * from brands;', function (err, result) {
                    var brands = result.rows;  
                    client.query('select * from categories;', function (err, result) {
                      var categories = result.rows;  
                      client.query('select * from globals;', function (err, result) {
                        var globals = result.rows; 
                        done();
                        res.render('new-offer', {cities : cities, sizes : sizes, conditions : conditions, brands : brands, categories : categories, globals : globals});
                      })     
                    })     
                  })     
                })      
            })      
        })
     })
  }
});

app.post('/place', urlencodedParser, function (req, res) {
  var main = true;
  var max = 0;
  var number = 0;

   if (req.body.sex == 0) {
    var gender = false;
   }
   else {
    var gender = true;
   }

   pool.connect(function (err, client, done) {
    client.query('BEGIN', function (err, result) {
      client.query('select max(lots.lot_id) from lots;', function (err, result) {
        counter = result.rows[0].max + 1;
         client.query('select max(images.img_id) from images;', function (err, result) {
              max = result.rows[0].max + 1;
              if (req.files.basePhoto.length == undefined) {
                fs.writeFileSync("public/image" + Number(max) + ".jpg", req.files.basePhoto.data);
              }
              else {
                for (i=0; i<req.files.basePhoto.length; i++){
                  fs.writeFileSync("public/image" + Number(max + i) + ".jpg", req.files.basePhoto[i].data);
                }
              }
              client.query('INSERT INTO lots(lot_id, user_id, brand_id, comment, time, price, gender, category_id, city_id, size_id, condition_id, permiss, model) ' +
                            'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);', 
                        [counter, req.cookies.user_id, req.body.brand, req.body.description, 333, Number(req.body.price), gender, req.body.category, req.body.city, req.body.size, req.body.condition, false, req.body.model], 
                            function (err, result) {
                              if (err) {
                console.log('ошибка1');
                res.status(400).send(err);
            }
              if (req.files.basePhoto.length == undefined) {
                client.query('INSERT INTO images(img_id, lot_id, img_name, ismain) VALUES($1, $2, $3, $4);', [max, counter, "image" + Number(max) + ".jpg", main], function (err, result) {
               if (err) {
                console.log('ошибка' + i);
            }
                })
              }
              else {
                  for (i=0; i<req.files.basePhoto.length; i++){
                    if (i>0) main = false;
                     client.query('INSERT INTO images(img_id, lot_id, img_name, ismain) VALUES($1, $2, $3, $4);', [max + i, counter, "image" + Number(max + i) + ".jpg", main], function (err, result) {
               if (err) {
                console.log('ошибка' + i);
            }
                })
                 }
              }
                 client.query('COMMIT', function (err, result) {
                   done()
                      res.redirect('/');
                })
            })
         })
        })
     })
  })
})


// -----------------------------------------------------------------------------------------------------


// Получение информации о лоте и продавце --------------------------------------------------------------


app.get('/auction/:id', function(req, res) {
  pool.connect(function (err, client, done) {
       client.query('select lots.lot_id, users.name, users.link, lots.user_id, lots.comment, lots.time, lots.price, lots.gender, ' +
                    'lots.model, images.img_id, brands.brand, cities.city, categories.category, globals.global, sizes.size, conditions.condition ' +
                    'from lots, users, images, brands, cities, categories, globals, sizes, conditions ' +
                    'where lots.lot_id = images.lot_id ' + 
                    'and lots.lot_id = $1 ' +
                    'and lots.brand_id = brands.brand_id ' +
                    'and lots.city_id = cities.city_id ' +
                    'and lots.category_id = categories.category_id ' +
                    'and categories.global_id = globals.global_id ' +
                    'and lots.size_id = sizes.size_id ' +
                    'and lots.condition_id = conditions.condition_id ' +
                    'and lots.user_id = users.user_id;', [Number(req.params.id)], function (err, result) {
                    shmot = result.rows;
                    
                      client.query('select reviews.review, users.name, reviews.score ' +
                                    'from reviews, users, users_reviews ' +
                                    'where users_reviews.user_id = $1 ' +
                                    'and users_reviews.review_id = reviews.review_id ' +
                                    'and reviews.customer_id = users.user_id', [shmot[0].user_id], function (err, result) {
          done()
            if (req.cookies.name == undefined) {
              res.render('auction', {shmot : shmot, info : '', money : '', fback : result.rows});
            }
            else {
                res.render('auction', {shmot : shmot, info : req.cookies.name, money : req.cookies.cash, fback : result.rows});
            }
            
        })
       })
   })
});


app.post('/feedback', urlencodedParser, function(req, res) {
  if (req.cookies.user_id == undefined) {
    res.redirect('/sign');
  }
  else {
  pool.connect(function (err, client, done) {
    client.query('select max(reviews.review_id) from reviews;', function (err, result) {
      max = result.rows[0].max + 1;
                      client.query('INSERT INTO reviews(review_id, review, score, customer_id, permiss) VALUES($1, $2, $3, $4, $5);', [max, req.body.feedback, req.body.score, req.cookies.user_id, true], function (err, result) {
                          client.query('INSERT INTO users_reviews(user_id, review_id) VALUES($1, $2);', [req.body.user_id, max], function (err, result) {
                              done();
                              res.redirect('/');
                          })
                      })
                })
    })
  }
});


// ----------------------------------------------------------------------------------------------------


// Обработка объявлений админом -----------------------------------------------------------------------

app.get('/ok/:id', function(req, res) {
  pool.connect(function (err, client, done) {
    client.query('UPDATE lots SET permiss = $1 WHERE lot_id = $2', [true, Number(req.params.id)], function (err, result) {
      if (err) {
                console.log(err);
                res.status(400).send(err);
            }
      done()
        res.redirect('/admin');
    })
  })
});

app.get('/no/:id', function(req, res) {
  pool.connect(function (err, client, done) {
    client.query('DELETE FROM lots WHERE lot_id = $1;', [Number(req.params.id)], function (err, result) {
      done()
        res.redirect('/admin');
    })
  })
});

// --------------------------------------------------------------------------------------------------


app.listen(process.env.PORT);


