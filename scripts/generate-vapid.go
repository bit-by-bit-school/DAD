package main

import (
	"fmt"
	"log"

	"github.com/SherClockHolmes/webpush-go"
)

func main() {
	privateKey, publicKey, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		log.Fatalf("Failed to generate VAPID keys: %v", err)
	}
	fmt.Println("# Generated VAPID Keys for Web Push")
	fmt.Printf("VAPID_PUBLIC_KEY=\"%s\"\n", publicKey)
	fmt.Printf("VAPID_PRIVATE_KEY=\"%s\"\n", privateKey)
	fmt.Printf("VAPID_SUBJECT=\"mailto:admin@solutionshub.local\"\n")
}
