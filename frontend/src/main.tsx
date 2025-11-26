import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";
import MultiRoleProtectedRoute from "./MultiRoleProtectedRoute";
import Layout from "./Layout";
import AuthProvider from "./auth/AuthProvider"; 
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

// Lazy load pages for better initial bundle size
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Leads = lazy(() => import("./pages/Leads"));
const Appointments = lazy(() => import("./Appointments"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Reportes = lazy(() => import("./pages/Reportes"));
const Oftalmologo = lazy(() => import("./pages/Oftalmologo"));
const Ventas = lazy(() => import("./pages/Ventas"));
const Productos = lazy(() => import("./pages/Productos"));
const Alertas = lazy(() => import("./pages/Alertas"));
const Operativos = lazy(() => import("./pages/Operativos"));

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Cargando...</p>
    </div>
  </div>
);


const router = createBrowserRouter([
  { 
    path: "/login", 
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Login />
      </Suspense>
    )
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Home />
          </Suspense>
        )
      },
      { 
        path: "leads", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RoleProtectedRoute requiredRole="captador">
              <Leads />
            </RoleProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "appointments",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RoleProtectedRoute requiredRole="oftalmologo">
              <Appointments />
            </RoleProtectedRoute>
          </Suspense>
        )
      },
      { 
        path: "clientes", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <MultiRoleProtectedRoute requiredRoles={['captador', 'oftalmologo', 'admin']}>
              <Clientes />
            </MultiRoleProtectedRoute>
          </Suspense>
        )
      },
      { 
        path: "oftalmologo", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RoleProtectedRoute requiredRole="oftalmologo">
              <Oftalmologo />
            </RoleProtectedRoute>
          </Suspense>
        )
      },
      { 
        path: "reportes", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RoleProtectedRoute requiredRole="admin">
              <Reportes />
            </RoleProtectedRoute>
          </Suspense>
        )
      },
      { 
        path: "ventas", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RoleProtectedRoute requiredRole="admin">
              <Ventas />
            </RoleProtectedRoute>
          </Suspense>
        )
      },
      { 
        path: "productos", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RoleProtectedRoute requiredRole="admin">
              <Productos />
            </RoleProtectedRoute>
          </Suspense>
        )
      },
      { 
        path: "alertas", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RoleProtectedRoute requiredRole="admin">
              <Alertas />
            </RoleProtectedRoute>
          </Suspense>
        )
      },
      { 
        path: "operativos", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RoleProtectedRoute requiredRole="admin">
              <Operativos />
            </RoleProtectedRoute>
          </Suspense>
        )
      },
    ],
  },
  // Redirect cualquier ruta no encontrada a /
  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
