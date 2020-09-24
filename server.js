const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const MongoClient = require('mongodb').MongoClient;
const mongouri = 'mongodb+srv://'+process.env.USER+':'+process.env.PASS+'@'+process.env.MONGOHOST;

// トップ画面
app.get('/', (request, response) => {
  response.sendFile(__dirname + '/views/index.html');
});

// 登録画面
app.get('/signup', (request, response) => {
  response.sendFile(__dirname + '/views/signup.html');
});

app.post('/signup', function(req, res){
  const userName = req.body.userName;
  const password = req.body.password;
  MongoClient.connect(mongouri, function(error, client) {
    const db = client.db(process.env.DB); // 対象 DB
    const col = db.collection('accounts'); // 対象コレクション
    const user = {name: userName, password:password}; // 保存対象
    col.insertOne(user, function(err, result) {
      res.redirect('/'); // リダイレクト
      client.close(); // DB を閉じる
    });
  });
});

app.post('/login', function(req, res){
  const userName = req.body.userName;
  const password = req.body.password;
  MongoClient.connect(mongouri, function(error, client) {
    const db = client.db(process.env.DB); // 対象 DB
    const col = db.collection('accounts'); // 対象コレクション
    col.findOne({name:{$eq:userName}, password:{$eq:password}}, function(err, user){
      client.close();
      if(user) {
        
      }
    });
  });
});

const listener = app.listen(process.env.PORT);
