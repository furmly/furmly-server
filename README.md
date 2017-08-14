# Certificate Installation

To simplify the configuration, let’s grab the following CA configuration file.
```
[https://raw.githubusercontent.com/anders94/https-authorized-clients/master/keys/ca.cnf]
```

Next, we’ll create a new certificate authority using this configuration.
```
openssl req -new -x509 -days 9999 -config ca.cnf -keyout ca-key.pem -out ca-crt.pem
```
Now that we have our certificate authority in ca-key.pem and ca-crt.pem, let’s generate a private key for the server.
```
openssl genrsa -out server-key.pem 4096
```
Our next move is to generate a certificate signing request. Again to simplify configuration, let’s use server.cnf as a configuration shortcut.
```
[https://raw.githubusercontent.com/anders94/https-authorized-clients/master/keys/server.cnf]
```
Now we’ll generate the certificate signing request.
```
openssl req -new -config server.cnf -key server-key.pem -out server-csr.pem
```
Now let’s sign the request.
```
openssl x509 -req -extfile server.cnf -days 999 -passin "pass:password" -in server-csr.pem -CA ca-crt.pem -CAkey ca-key.pem -CAcreateserial -out server-crt.pem
```
Our server certificate is all set and ready to go!


# Client Certificates
Now, for the certificate on the client side, we’re going to need something that the client can present to our new server. Let’s make two of them while we’re at it.
```
openssl genrsa -out client1-key.pem 4096
```

We’ll use config files again to save us some typing.
```
[https://raw.githubusercontent.com/anders94/https-authorized-clients/master/keys/client1.cnf]
```

Now let’s create a pair of certificate signing requests.
```
openssl req -new -config client1.cnf -key client1-key.pem -out client1-csr.pem
```
And sign our new client certs.
```
openssl x509 -req -extfile client1.cnf -days 999 -passin "pass:password" -in client1-csr.pem -CA ca-crt.pem -CAkey ca-key.pem -CAcreateserial -out client1-crt.pem
```


Just to make sure everything in the OpenSSL world worked as expected, let’s verify our certs. (you can do this with the server certificate as well if you like)
```
openssl verify -CAfile ca-crt.pem client1-crt.pem
```
We should get an “OK” if all is well.