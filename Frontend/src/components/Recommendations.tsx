import React, { useState, useEffect, useContext } from 'react';
import { CartContext } from '../context/CartContextType';
import type { CartItem } from '../context/CartContextType';

interface Recommendation {
  _id: string;
  name: string;
  price: number;
  images?: Array<string | { url?: string }>;
  rating?: number;
  reviewCount?: number;
  predictedRating?: number;
  reason?: string;
}

const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cartContext = useContext(CartContext);
  const addToCart = cartContext?.addToCart;

  // Change this to match your actual Backend URL
  const BACKEND_URL = 'http://localhost:5000';

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Get the actual user from localStorage
        const storedUser = localStorage.getItem('user');
        let userId = '';

        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            userId = user._id;
          } catch (e) {
            console.error("Error parsing user from localStorage", e);
          }
        }

        // 2. IMPORTANT: If no valid userId exists, use a valid-format 24-char hex fallback
        // 'user_1' was causing your CastError. This valid hex string will not.
        if (!userId || userId.length !== 24) {
          userId = '65d8c12e9f1a2b3c4d5e6f78'; 
        }

        // 3. Fetch from the full BACKEND URL (to avoid the HTML/SyntaxError)
        const response = await fetch(`${BACKEND_URL}/product/recommendations/${userId}?num=6`);
        
        if (!response.ok) {
          // If the server returns 404 or 500, this catches it
          const errorText = await response.text();
          console.error("Server Error Response:", errorText);
          throw new Error('Failed to fetch recommendations');
        }

        const data = await response.json();
        
        if (data.success && data.recommendations) {
          setRecommendations(data.recommendations);
        } else {
          setError('No recommendations available');
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Could not load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="py-8 px-4">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
           Recommended For You
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null; 
  }

  return (
    <div className="py-8 px-4 bg-gradient-to-b from-blue-50 to-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <span>Personalized For You</span>
          </h2>
          <p className="text-gray-600 text-sm">
            Based on our AI analysis of your preferences and similar user behavior
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((product) => (
            <div
              key={product._id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="relative w-full h-48 bg-gray-100 flex items-center justify-center group">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={
                      typeof product.images[0] === 'string'
                        ? product.images[0]
                        : product.images[0]?.url
                    }
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="text-gray-400">No image</div>
                )}

                {product.predictedRating && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
                    ⭐ {product.predictedRating.toFixed(1)}
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                  {product.name}
                </h3>

                {product.rating && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                    <span>⭐ {product.rating.toFixed(1)}</span>
                    {product.reviewCount && (
                      <span>({product.reviewCount} reviews)</span>
                    )}
                  </div>
                )}

                <div className="mb-3">
                  <span className="text-lg font-bold text-gray-900">
                    Rs. {product.price?.toLocaleString()}
                  </span>
                </div>

                {product.reason && (
                  <p className="text-xs text-blue-600 mb-3 bg-blue-50 p-2 rounded">
                    💡 {product.reason}
                  </p>
                )}

                <button
                  onClick={() => {
                    if (addToCart) {
                      const cartItem: CartItem = {
                        _id: product._id,
                        name: product.name,
                        price: product.price,
                        quantity: 1,
                        images: product.images
                      };
                      addToCart(cartItem);
                      alert(`✓ ${product.name} added to cart!`);
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Recommendations;