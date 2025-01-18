function send_notification(deviceToken, data) {
    try {
      var request = require("request");
  
      var options = {
        method: "POST",
        url: "https://fcm.googleapis.com/fcm/send",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "key=AAAAYS9M5nI:APA91bFnS3bvUXQM9mYPZth0FF_OolGjh4rZGgvRsEPrJx9_wm1GQQE5uzvPtCS8Gi6wCdRgYJxZy6a8Ai7QbC_F9qdiEFbti4J1MA5SWv00PdeW4BuKQRHmg5TUfmYtEDEak1vdQZ4q",
        },
        body: JSON.stringify({
          to: deviceToken,
          notification: data,
          data: data,
        }),
      };
      request(options, function (error, response) {
        if (error) {
          ////console.log("8888888888888888888888888888888888888888888888888888888888888888888888888888888", error.message);
          throw new Error(error);
        }
      });
    } catch (reooe) {
      ////console.log(reooe.message, "reooe");
    }
  }