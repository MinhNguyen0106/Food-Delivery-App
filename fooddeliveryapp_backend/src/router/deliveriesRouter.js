const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/deliveriesController");
router.get("/", ctrl.getAll);
router.get("/shipper/:shipperId", ctrl.getByShipperId);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.delete);
module.exports = router;
