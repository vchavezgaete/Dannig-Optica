// Pruebas de Postman para el endpoint /auth/fix-admin-role
// Estas pruebas verifican que el endpoint funcione correctamente

// Test 1: Verificar que la respuesta es exitosa (2xx)
pm.test("Status is 2xx", function () {
  pm.response.to.be.success;
});

// Test 2: Verificar que el Content-Type es JSON
pm.test("Content-Type is JSON", function () {
  pm.response.to.have.header("Content-Type");
  pm.expect(pm.response.headers.get("Content-Type")).to.match(/application\/json/i);
});

// Test 3: Verificar que la respuesta tiene la estructura esperada
pm.test("Response has correct structure", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('ok');
  pm.expect(jsonData).to.have.property('message');
  pm.expect(jsonData).to.have.property('usuario');
});

// Test 4: Verificar que 'ok' es true
pm.test("Operation was successful", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.ok).to.be.true;
});

// Test 5: Verificar que el usuario tiene el correo correcto
pm.test("User email matches request", function () {
  const jsonData = pm.response.json();
  const requestBody = JSON.parse(pm.request.body.raw);
  pm.expect(jsonData.usuario.correo).to.equal(requestBody.email);
});

// Test 6: Verificar que el usuario tiene roles asignados
pm.test("User has roles assigned", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.usuario.roles).to.be.an('array');
  pm.expect(jsonData.usuario.roles.length).to.be.at.least(1);
});

// Test 7: Verificar que el usuario tiene el rol 'admin'
pm.test("User has admin role", function () {
  const jsonData = pm.response.json();
  const hasAdminRole = jsonData.usuario.roles.some(role => 
    role.toLowerCase() === 'admin' || role.toLowerCase() === 'administrador'
  );
  pm.expect(hasAdminRole).to.be.true;
});

// Test 8: Verificar que el usuario tiene un ID válido
pm.test("User has valid ID", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.usuario.id).to.be.a('number');
  pm.expect(jsonData.usuario.id).to.be.above(0);
});

// Log response body for debugging
console.log("Response body:", pm.response.text());
console.log("Response status:", pm.response.code);
console.log("User roles:", pm.response.json().usuario?.roles);

