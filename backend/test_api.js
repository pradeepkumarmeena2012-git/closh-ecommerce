import axios from 'axios';

async function testApi() {
  try {
    const response = await axios.post('http://localhost:5000/api/admin/notifications/push-to-user', {
      userId: "65f123456789012345678901", // Fake but valid length ID
      title: "Test",
      message: "Hello"
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // I need a token
      }
    });
    console.log(response.data);
  } catch (err) {
    console.log('Status:', err.response?.status);
    console.log('Data:', err.response?.data);
  }
}
// We will run this without token just to see if we get 401 or 400
testApi();
