import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ProductDetails } from './pages/ProductDetails';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { CheckoutSuccess } from './pages/CheckoutSuccess';
import { Orders } from './pages/Orders';
import { Account } from './pages/Account';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="product/:id" element={<ProductDetails />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="checkout/success" element={<CheckoutSuccess />} />
          <Route path="orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
