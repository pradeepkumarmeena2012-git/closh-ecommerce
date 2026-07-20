import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
        quantity: { type: Number, required: true, min: 1, default: 1 },
        variant: {
            size: { type: String, default: '' },
            color: { type: String, default: '' },
        },
    },
    { _id: true }
);

const cartSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
        items: [cartItemSchema],
    },
    { timestamps: true }
);

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
