package webrtcService

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{} // use default options

var phoneMap = make(map[string]*User)

func handler(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	defer c.Close()

	user := NewUser(c)
	user.HandleMsg()
}

func Serve() {
	http.HandleFunc("/signaling", handler)
	fs := http.FileServer(http.Dir("./client"))
	http.Handle("/", fs)
	log.Printf("http://localhost:9999\n")
	log.Fatal(http.ListenAndServe(":9999", nil))
}
