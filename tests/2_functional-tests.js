const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = chai.assert;
const server = require('../server');
const brypt = require('bcrypt')
chai.use(chaiHttp);
let testThread_id = '';
let testReply_id = '';
suite("Functional Tests", function () {
    test("Creating a new thread: POST request to /api/threads/{board}", function (done) {
      chai
        .request(server)
        .post("/api/threads/test-board")
        .send({ text: "test text", delete_password: "test" })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body.text, "test text");
          assert.isTrue(brypt.compareSync("test",res.body.delete_password));
          assert.equal(res.body.reported, false);
          testThread_id = res.body._id;
          done();
        });
    });
    test("Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}", function (done) {
      chai
        .request(server)
        .get("/api/threads/test-board")
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.exists(res.body[0], "There is a thread");
          assert.equal(res.body[0].text, "test text");
          done();
        });
    });
    test("Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password", function (done) {
      chai
        .request(server)
        .delete("/api/threads/test-board")
        .send({ thread_id: testThread_id, delete_password: "incorrect" })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, "incorrect password");
          done();
        });
    });
    // Reporting a thread: PUT request to /api/threads/{board}
    test("Reporting a thread: PUT request to /api/threads/{board}", function (done) {
      console.log(testThread_id);
      chai
        .request(server)
        .put("/api/threads/test-board")
        .send({ thread_id: testThread_id })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, "reported");
          done();
        });
    });
    test("Creating a new reply: POST request to /api/replies/{board}", function (done) {
      chai
        .request(server)
        .post("/api/replies/test-board")
        .send({
          thread_id: testThread_id,
          text: "test reply",
          delete_password: "testreply",
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body.text, "test reply");
          testReply_id = res.body._id;
          done();
        });
    });
    // Viewing a single thread with all replies: GET request to /api/replies/{board}
    test("Viewing a single thread with all replies: GET request to /api/replies/{board}", function (done) {
      chai
        .request(server)
        .get("/api/replies/test-board")
        .query({
          thread_id: testThread_id,
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body._id, testThread_id);
          assert.equal(res.body.text, "test text");
          assert.equal(res.body.replies[0].text, "test reply");
          done();
        });
    });
    // Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password
    test("Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password", function (done) {
      
      chai
        .request(server)
        .delete("/api/replies/test-board")
        .send({
          thread_id: testThread_id,
          reply_id: testReply_id,
          delete_password: "Incorrect",
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, "incorrect password");
          done();
        });
    });
    // Reporting a reply: PUT request to /api/replies/{board}
    test("Reporting a reply: PUT request to /api/replies/{board}", function (done) {
      chai
        .request(server)
        .put("/api/replies/test-board")
        .send({
          thread_id: testThread_id,
          reply_id: testReply_id,
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, "reported");
          done();
        });
    });
    // Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password
    test("Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password", function (done) {
      chai
        .request(server)
        .delete("/api/replies/test-board")
        .send({
          thread_id: testThread_id,
          reply_id: testReply_id,
          delete_password: "testreply",
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, "success");
          done();
        });
    });
    // Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password
    test("Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password", function (done) {
      chai
        .request(server)
        .delete("/api/threads/test-board")
        .send({ thread_id: testThread_id, delete_password: "test" })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, "success");
          done();
        });
    });
});