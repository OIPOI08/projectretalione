const express = require("express");

const router = express.Router();

const {
    createPosting
} = require("../controllers/postingController");

router.post("/posting", createPosting);

module.exports = router;