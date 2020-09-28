const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const cookieParser = require("cookie-parser");
app.use(cookieParser());

const mongodb = require("mongodb");
const MongoClient = require("mongodb").MongoClient;
const mongouri =
  "mongodb+srv://" +
  process.env.USER +
  ":" +
  process.env.PASS +
  "@" +
  process.env.MONGOHOST;
const ObjectID = mongodb.ObjectID;

// トップ画面
app.get("/", (req, res) => {
  if (req.cookies.user) {
    res.sendFile(__dirname + "/views/food.html");
    return;
  }

  res.sendFile(__dirname + "/views/login.html");
});

// 登録画面
app.get("/signup", (req, res) => {
  if (req.cookies.user) {
    res.sendFile(__dirname + "/views/food.html");
    return;
  }

  res.sendFile(__dirname + "/views/signup.html");
});

// ログイン失敗画面
app.get("/failed", (req, res) => {
  if (req.cookies.user) {
    res.sendFile(__dirname + "/views/food.html");
    return;
  }

  res.sendFile(__dirname + "/views/failed.html");
});

app.get("/logout", (req, res) => {
  res.clearCookie("user"); // クッキーをクリア
  res.redirect("/");
});

app.post("/signup", function(req, res) {
  const userName = req.body.userName;
  const password = req.body.password;
  MongoClient.connect(mongouri, function(error, client) {
    const db = client.db(process.env.DB); // 対象 DB
    const col = db.collection("accounts"); // 対象コレクション
    const user = { name: userName, password: password }; // 保存対象
    // ★★★本来パスワードは平文（入力されたそのままの文字列）で保存すべきではない
    // crypto モジュールでハッシュ化するなどすべき
    // ログインの際も入力されたパスワードをハッシュ化した上で
    // 保存されているハッシュ化済みのパスワードと比較する
    // 参考：https://qiita.com/kou_pg_0131/items/174aefd8f894fea4d11a
    col.insertOne(user, function(err, result) {
      res.redirect("/"); // リダイレクト
      client.close(); // DB を閉じる
    });
  });
});

app.post("/login", function(req, res) {
  const userName = req.body.userName;
  const password = req.body.password;
  MongoClient.connect(mongouri, function(error, client) {
    const db = client.db(process.env.DB); // 対象 DB
    const col = db.collection("accounts"); // 対象コレクション

    // 登録時にパスワードをハッシュ化しているならば
    // ここで password をハッシュ化して検索する
    // ハッシュ化した値同士で比較する
    const condition = { name: { $eq: userName }, password: { $eq: password } }; // ユーザ名とパスワードで検索する
    col.findOne(condition, function(err, user) {
      client.close();
      if (user) {
        res.cookie("user", user); // ヒットしたらクッキーに保存
        res.redirect("/"); // リダイレクト
      } else {
        res.redirect("/failed"); // リダイレクト
      }
    });
  });
});

// ハッシュ化用
const crypto = require("crypto");

function hashed(password) {
  let hash = crypto.createHmac("sha512", password);
  hash.update(password);
  let value = hash.digest("hex");
  return value;
}

app.get('/findUser',function(req,res){
  res.json(req.cookies.user);
  // res.sendStatus(200);
  // MongoClient.connect(mongouri, function(error, client) {
  //   const db = client.db(process.env.DB); // 対象 DB
  //   const colUser = db.collection("accounts");
  //   const condition = {};
  //   colUser.find(condition,{name:1, password: 0}).toArray(function(err, accounts) {
  //     res.json(accounts); // レスポンスとしてユーザを JSON 形式で返却
  //     client.close(); // DB を閉じる
  //   });
  // });
});


// Foodページ
app.post("/saveFood", function(req, res) {
  let received = "";
  req.setEncoding("utf8");
  //   クライアントからデータ取得時に発生するイベント
  req.on("data", function(chunk) {
    received += chunk;
  });
  req.on("end", function() {
    MongoClient.connect(mongouri, function(error, client) {
      const db = client.db(process.env.DB); // 対象 DB
      const colFood = db.collection("foods"); // 対象コレクション
      const food = JSON.parse(received); // 保存対象
      food.user_id = req.cookies.user._id;
      colFood.insertOne(food, function(err, result) {
        res.send(decodeURIComponent(result.insertedId)); // 追加したデータの ID を返す
        client.close(); // DB を閉じる
      });
    });
  });
});


app.get("/findFoods", function(req, res) {
  MongoClient.connect(mongouri, function(error, client) {
    const db = client.db(process.env.DB); // 対象 DB
    const colFood = db.collection("foods"); // 対象コレクション
    const colCookie = db.collection("accounts");
     
    // 検索条件（名前が「エクサくん」ではない）
    // 条件の作り方： https://docs.mongodb.com/manual/reference/operator/query/
    // const oId = new ObjectID(req.cookies.user._id);
    const condition = {user_id: {$eq: req.cookies.user._id}};

    colFood.find(condition).toArray(function(err, foods) {
      res.json(foods); // レスポンスとしてユーザを JSON 形式で返却
      client.close(); // DB を閉じる
    });
  });
});

app.post("/deleteFood", function(req, res) {
  let received = "";
  req.setEncoding("utf8");
  req.on("data", function(chunk) {
    received += chunk;
  });
  req.on("end", function() {
    MongoClient.connect(mongouri, function(error, client) {
      const db = client.db(process.env.DB); // 対象 DB
      const colFood = db.collection("foods"); // 対象コレクション
      const target = JSON.parse(received); // 保存対象
      const oid = new ObjectID(target.id);

      colFood.deleteOne({ _id: { $eq: oid } }, function(err, result) {
        res.sendStatus(200); // ステータスコードを返す
        client.close(); // DB を閉じる
      });
    });
  });
});

app.get("/deleteAll", function(req, res) {
  MongoClient.connect(mongouri, function(error, client) {
    const db = client.db(process.env.DB); // 対象 DB
    const colFood = db.collection("foods"); // 対象コレクション
    
    const condition = {user_id: {$eq: req.cookies.user._id}};
    colFood.deleteMany(condition, function(err, result) {
      res.sendStatus(200); // ステータスコードを返す
      client.close(); // DB を閉じる
    });
  });
});

const listener = app.listen(process.env.PORT);
