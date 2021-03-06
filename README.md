SomaFM Popup Player
===================

This is the HTML5 popup music player for [Somafm.com](http://www.somafm.com), based on the [JPlayer project](https://github.com/happyworm/jPlayer/).  SomaFM is over 20 unique channels of listener-supported, commercial-free, underground/alternative radio broadcasting from San Francisco. All music hand-picked by SomaFM's award-winning DJs and music directors.

Development Notes
----------
This player uses AJAX to communicate with the Somafm servers.  When developing locally, I recommend setting up a reverse proxy.  To do this with Apache, you can do the following....

1.  Enable mod_proxy_http
```
$ sudo a2enmod proxy_http
```

2.  Add the following to your httpd.conf file
```
<Proxy *>
    Order deny,allow
    Deny from all
    Allow from localhost
</Proxy>
ProxyPass /soma_proxy http://somafm.com connectiontimeout=5 timeout=5
ProxyPassReverse /soma_proxy http://somafm.com
```

3.  In popup/popup.js, set
```
var dev_mode = true;
```
