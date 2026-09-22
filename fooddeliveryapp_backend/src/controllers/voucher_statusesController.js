const Model = require('../models/voucher_statusesModel');

exports.getAll = (req, res) => {
    Model.getAll((err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy danh sách dữ liệu',
                error: err.message
            });
        }

        return res.status(200).json({
            success: true,
            data: result
        });
    });
};

exports.getById = (req, res) => {
    const { id } = req.params;

    Model.getById(id, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy dữ liệu',
                error: err.message
            });
        }

        if (!result || result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy dữ liệu'
            });
        }

        return res.status(200).json({
            success: true,
            data: result[0]
        });
    });
};

exports.create = (req, res) => {
    const data = req.body;

    Model.create(data, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi thêm dữ liệu',
                error: err.message
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Thêm dữ liệu thành công',
            id: result.insertId
        });
    });
};

exports.update = (req, res) => {
    const { id } = req.params;
    const data = req.body;

    Model.update(id, data, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi cập nhật dữ liệu',
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy dữ liệu để cập nhật'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật dữ liệu thành công'
        });
    });
};

exports.delete = (req, res) => {
    const { id } = req.params;

    Model.delete(id, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi xóa dữ liệu',
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy dữ liệu để xóa'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Xóa dữ liệu thành công'
        });
    });
};
