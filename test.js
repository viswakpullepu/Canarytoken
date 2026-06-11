async function test() {
  try {
    const res = await fetch('https://bit-ly-puce.vercel.app/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'testuser'
      },
      body: JSON.stringify({
        token_name: 'test',
        memo: 'test memo',
        redirect_url: 'https://google.com',
        payload_type: 'invisible'
      })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
