import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTrash, FaShoppingBag } from 'react-icons/fa';
import { CartContext } from '../context/CartContextType';

const ShoppingCart: React.FC = () => {
  const cartContext = useContext(CartContext);
  const navigate = useNavigate();

  if (!cartContext) {
    return null;
  }

  const { isCartOpen, setIsCartOpen, cartItems, removeFromCart, updateQuantity } = cartContext;

  // Calculate totals
  const subtotal = cartItems.reduce((sum: number, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 10; 
  const totalPrice = subtotal + deliveryFee;

  return (
    <>
      {/* Overlay */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Sidebar Cart */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 transform transition-transform duration-300 overflow-y-auto ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-teal-100">
                <FaShoppingBag className="text-teal-600 text-lg" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Shopping Cart ({cartItems.length} items)</h2>
            </div>
            <p className="text-sm text-gray-600">Review your items and proceed to checkout</p>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="Close cart"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart Items or Empty State */}
        <div className="p-6">
          {cartItems.length === 0 ? (
            // Empty Cart State
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-6">
                <svg className="w-20 h-20 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Add items to your cart to get started</p>
              <button
                onClick={() => {
                  navigate('/');
                  setIsCartOpen(false);
                }}
                className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            // Cart Items List
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item._id}
                  className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center">
                        <FaShoppingBag className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">${item.price.toFixed(2)}</p>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => updateQuantity(item._id, Math.max(1, item.quantity - 1))}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-medium transition-colors"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-medium transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                    aria-label="Remove from cart"
                  >
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Total & Checkout */}
        {cartItems.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 space-y-4">
            {/* Price Summary */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery Fee</span>
                <span>$ {deliveryFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span className="text-teal-600"> $ {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Link
              to="/checkout"
              onClick={() => setIsCartOpen(false)}
              className="w-full bg-teal-600 text-white font-medium py-3 rounded-lg hover:bg-teal-700 transition-colors text-center block"
            >
              Proceed to Checkout
            </Link>

            {/* Continue Shopping Button */}
            <button
              onClick={() => {
                navigate('/');
                setIsCartOpen(false);
              }}
              className="w-full bg-gray-100 text-gray-900 font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ShoppingCart;
