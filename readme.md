Webrtc Demo
==

启动
===

执行命令

`go run cmd/webrtc/main.go`

浏览器打开

http://localhost:9999


配置和依赖:
===


**安装turn server:**

ubuntu:

```
 sudo apt install coturn
```

修改本地 iceserver (client/script.js)


```javascript
var localICEServer = {
	urls: 'turn:172.29.0.156:3478',
	username: 'test',
	credential: 'test'
}
```


