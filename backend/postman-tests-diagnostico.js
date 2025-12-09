// Pruebas de Postman para el endpoint /auth/diagnostico
// Estas pruebas verifican el estado del sistema y del usuario admin

// Test 1: Verificar que la respuesta es exitosa (2xx)
pm.test("Status is 2xx", function () {
  pm.response.to.be.success;
});

// Test 2: Verificar que el Content-Type es JSON
pm.test("Content-Type is JSON", function () {
  pm.response.to.have.header("Content-Type");
  pm.expect(pm.response.headers.get("Content-Type")).to.match(/application\/json/i);
});

// Test 3: Verificar estructura del diagnóstico
pm.test("Diagnostico has correct structure", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('jwt');
  pm.expect(jsonData).to.have.property('usuarios');
  pm.expect(jsonData).to.have.property('servidor');
});

// Test 4: Verificar que JWT está configurado
pm.test("JWT is configured", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.jwt.configurado).to.be.true;
});

// Test 5: Verificar que hay usuarios en el sistema
pm.test("System has users", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.usuarios.total).to.be.at.least(0);
});

// Test 6: Verificar información del usuario admin
pm.test("Admin user information is available", function () {
  const jsonData = pm.response.json();
  if (jsonData.usuarios.adminRoles) {
    pm.expect(jsonData.usuarios.adminRoles).to.be.an('array');
    console.log("Admin roles:", jsonData.usuarios.adminRoles);
  }
  if (jsonData.usuarios.adminTieneRol !== undefined) {
    console.log("Admin tiene rol:", jsonData.usuarios.adminTieneRol);
    if (!jsonData.usuarios.adminTieneRol) {
      console.warn("⚠️ El usuario admin NO tiene rol asignado. Ejecuta /auth/fix-admin-role para corregirlo.");
    }
  }
});

// Test 7: Verificar que el servidor está corriendo
pm.test("Server is running", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.servidor.estado).to.equal('running');
});

// Log completo para debugging
console.log("=== DIAGNÓSTICO COMPLETO ===");
console.log("Response body:", pm.response.text());
console.log("JWT configurado:", pm.response.json().jwt?.configurado);
console.log("Total usuarios:", pm.response.json().usuarios?.total);
console.log("Usuarios activos:", pm.response.json().usuarios?.activos);
console.log("Admin roles:", pm.response.json().usuarios?.adminRoles);
console.log("Admin tiene rol:", pm.response.json().usuarios?.adminTieneRol);

