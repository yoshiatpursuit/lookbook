import('axios').then(({ default: axios }) => {
  axios.get('http://localhost:4002/api/profiles?limit=5')
    .then(res => {
      console.log('✅ API Response:', {
        success: res.data.success,
        dataLength: res.data.data?.length,
        firstProfile: res.data.data?.[0]?.name
      });
    })
    .catch(err => {
      console.error('❌ API Error:', err.message);
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
      }
    });
});
