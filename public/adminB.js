// a file for some of the uglier stuff in the admin/tests that was cluttering up the server.js

"use strict";

(function(exports){

  exports.staffInitiation = function () {

  }

  exports.dumbleKey = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xjMEW2fjIhYJKwYBBAHaRw8BAQdA+OcLoatqWo/nZxTDGMTickpKcxIG2cq1
8SMYpzJdDDnNFWJvYiA8Ym9iQGV4YW1wbGUuY29tPsJ3BBAWCgApBQJbZ+Mi
BgsJBwgDAgkQxwA1L9dFCHAEFQgKAgMWAgECGQECGwMCHgEAAEmNAQCc2Ojl
ROlA7bXEyU0svf7nqMKkr0LLbNYQFSmvgkwPyQEAzI3mcfDh1G1tjqhrkrD7
Nm3AOYP7jTgy4VJg8t/7/gHOOARbZ+MiEgorBgEEAZdVAQUBAQdAYPFb8/Lm
kh1Rej9ih0Tz97APvQFEOSmncfX7tcZMbRkDAQgHwmEEGBYIABMFAltn4yIJ
EMcANS/XRQhwAhsMAAARyAEA5JMTLCNuQ6mZtGz/ltMs0MuiY+r8RH2jXCI6
uZUSqyIA/1EMtnvEAGJObl0Xbbm2ygNe/yufWQ69PfTdTavq8xoG
=7ZeE
-----END PGP PUBLIC KEY BLOCK-----`

  exports.getdumbData = function () {
    var dumbData = {};

    var smeeKeys = {pubKey:`-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xjMEW02YyRYJKwYBBAHaRw8BAQdAKO/kW0bt6Mvay5IRTHA79ydgsZT00VCr
FPSTmeGp73HNFWJvYiA8Ym9iQGV4YW1wbGUuY29tPsJ3BBAWCgApBQJbTZjJ
BgsJBwgDAgkQoWxpC/plDt0EFQgKAgMWAgECGQECGwMCHgEAAF6gAQD0Tv7v
/JsbvAS76+jbu/9fjxsgvevrpXtGiZ3OShg8ZAD9E9tmyg7JPKz1IdR6ecTP
FYu0HlvMNiH6Xvv5+ws3kw7OOARbTZjJEgorBgEEAZdVAQUBAQdAG+GXxfrJ
hSz3652DzWxer+6PFLdV7z+5BCXKemRgm0EDAQgHwmEEGBYIABMFAltNmMkJ
EKFsaQv6ZQ7dAhsMAADbBQEA4w9RZ4ycBiu1iDFfw5E6LbJFOTyuQyF/gJEu
3VoGlyEA/0mt3MJ9gBJ2tgqhn/dL81ZYfeMou4G+vLrvEzGw30gG
=SwgW
-----END PGP PUBLIC KEY BLOCK-----`,
      privKey:`-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xYYEW02YyRYJKwYBBAHaRw8BAQdAKO/kW0bt6Mvay5IRTHA79ydgsZT00VCr
FPSTmeGp73H+CQMI/iNrn7dzZOZg1z8UF+UPrg+oct1QNkrSj4zAvnrq5M4X
hzRg8p3sfF48hNJ471dnL4oZV5aMNuSzMgw957p+Qc+8am5FxmG0d1pen7kN
PM0VYm9iIDxib2JAZXhhbXBsZS5jb20+wncEEBYKACkFAltNmMkGCwkHCAMC
CRChbGkL+mUO3QQVCAoCAxYCAQIZAQIbAwIeAQAAXqABAPRO/u/8mxu8BLvr
6Nu7/1+PGyC96+ule0aJnc5KGDxkAP0T22bKDsk8rPUh1Hp5xM8Vi7QeW8w2
Ifpe+/n7CzeTDseLBFtNmMkSCisGAQQBl1UBBQEBB0Ab4ZfF+smFLPfrnYPN
bF6v7o8Ut1XvP7kEJcp6ZGCbQQMBCAf+CQMIccINf+9PC9FgV763u79kz3YF
rEnzDlbvv+jrtfLSggqgly4h98WVCUQ6ljQRnmUDRSpNJ3odfNS8YV6kczle
8QfIPD3I7cWgpSG01YilrMJhBBgWCAATBQJbTZjJCRChbGkL+mUO3QIbDAAA
2wUBAOMPUWeMnAYrtYgxX8OROi2yRTk8rkMhf4CRLt1aBpchAP9JrdzCfYAS
drYKoZ/3S/NWWH3jKLuBvry67xMxsN9IBg==
=MdT9
-----END PGP PRIVATE KEY BLOCK-----`
    }
    var ninkKeys = {pubKey:`-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xjMEW02aAhYJKwYBBAHaRw8BAQdAQDBbCTTC/9CkoPdVAOQmvyivkx3gaMyx
Njbms2usjdnNFWJvYiA8Ym9iQGV4YW1wbGUuY29tPsJ3BBAWCgApBQJbTZoC
BgsJBwgDAgkQL/dZbwaWv88EFQgKAgMWAgECGQECGwMCHgEAAJpFAQDOEioJ
vMh3t/nAb3tKPhZHYNDiwrj/A3iM14LTmQ5ofQEA5BMQuIK8QAIkf7xTWclK
WqzlOYJ7H6OEr69oFQDgYwbOOARbTZoCEgorBgEEAZdVAQUBAQdA4yMgcJsl
bs0t1vngiLg7MWiwhrKktZfoIGOHVwUWxRkDAQgHwmEEGBYIABMFAltNmgIJ
EC/3WW8Glr/PAhsMAAA7SgD+PkGXbhIOLfjJfFuVnIKZVVjgsCQYoIHnPUQQ
4fEx+SoBAN3eybRrsd9QyJYiCJhjA+lfccjzSRL2xhX6gkwwxuYP
=adY6
-----END PGP PUBLIC KEY BLOCK-----`,
      privKey:`-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xYYEW02aAhYJKwYBBAHaRw8BAQdAQDBbCTTC/9CkoPdVAOQmvyivkx3gaMyx
Njbms2usjdn+CQMIYcOdz1UihqpgRklV7DLZ8fj1S8zKwcFWFBtMZeiVMZSp
Y3q56OtgIlAoWxBlsWGxYTsImnytjwSWdcg00Ts/Ic7DuNOEqHnhVpRD6bbW
980VYm9iIDxib2JAZXhhbXBsZS5jb20+wncEEBYKACkFAltNmgIGCwkHCAMC
CRAv91lvBpa/zwQVCAoCAxYCAQIZAQIbAwIeAQAAmkUBAM4SKgm8yHe3+cBv
e0o+Fkdg0OLCuP8DeIzXgtOZDmh9AQDkExC4grxAAiR/vFNZyUparOU5gnsf
o4Svr2gVAOBjBseLBFtNmgISCisGAQQBl1UBBQEBB0DjIyBwmyVuzS3W+eCI
uDsxaLCGsqS1l+ggY4dXBRbFGQMBCAf+CQMI7YvN0HdkSX9gM2pLZtBjqvuH
6ceJM7AGkX75VA9UKccJTnSmY65zhStLUTB0moNiZ5r4rYE4zPK2j1o+WolE
W9hJWUr4P8sOrCQrWCWYkMJhBBgWCAATBQJbTZoCCRAv91lvBpa/zwIbDAAA
O0oA/j5Bl24SDi34yXxblZyCmVVY4LAkGKCB5z1EEOHxMfkqAQDd3sm0a7Hf
UMiWIgiYYwPpX3HI80kS9sYV+oJMMMbmDw==
=bQHK
-----END PGP PRIVATE KEY BLOCK-----`
    }
    var drooKeys = {pubKey:`-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xjMEW02f/BYJKwYBBAHaRw8BAQdAOcj8lyu7i37bvxvpf6P5Yn+C7fDN3KLU
Ky8lRrJzYr3NFWJvYiA8Ym9iQGV4YW1wbGUuY29tPsJ3BBAWCgApBQJbTZ/8
BgsJBwgDAgkQoil15yboAyAEFQgKAgMWAgECGQECGwMCHgEAAEozAQCZsa2m
mBz9kxF81YkJSfFK8kxIiF54aj6iSrc8TbVzLwD/cMUQARGYpVPWaURCfhsg
b9lmbKWVs5kgzQx2KG9jAwrOOARbTZ/8EgorBgEEAZdVAQUBAQdAljggpvGc
3ghhxolf0No6itZ5nl0boOLDNFL+1ljwZBYDAQgHwmEEGBYIABMFAltNn/wJ
EKIpdecm6AMgAhsMAAABtQEAm8xJ6iVcAlFRpDXRiiE7AQJBugLEFK3DyWlN
yg3nUnYBAPLQVONkbi6q8Tca6Wp6NeUc1kF36Wql2xXmGp/51xUN
=HXH3
-----END PGP PUBLIC KEY BLOCK-----`,
      privKey:`-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xYYEW02f/BYJKwYBBAHaRw8BAQdAOcj8lyu7i37bvxvpf6P5Yn+C7fDN3KLU
Ky8lRrJzYr3+CQMISRgWGFW8h1Rg/ilSXo4NDg3lviVtLusCo+ylQgaIsxZg
E6xst8lFk2ZjfSSRWVvHA4nbydOhB2uhAqA+ptD2A+Krm7f4mDL70Y9yzLaB
1c0VYm9iIDxib2JAZXhhbXBsZS5jb20+wncEEBYKACkFAltNn/wGCwkHCAMC
CRCiKXXnJugDIAQVCAoCAxYCAQIZAQIbAwIeAQAASjMBAJmxraaYHP2TEXzV
iQlJ8UryTEiIXnhqPqJKtzxNtXMvAP9wxRABEZilU9ZpREJ+GyBv2WZspZWz
mSDNDHYob2MDCseLBFtNn/wSCisGAQQBl1UBBQEBB0CWOCCm8ZzeCGHGiV/Q
2jqK1nmeXRug4sM0Uv7WWPBkFgMBCAf+CQMIZzajpUsVHZ1goABHaPhqHJZy
ibPEPHjdtCAh0ZuikNsyvM1RHVf2WHGvtRRu2rLObt4uSgzvcLxhNJY8cEoL
t6bRLHHgiJwewHVLXmfsWsJhBBgWCAATBQJbTZ/8CRCiKXXnJugDIAIbDAAA
AbUBAJvMSeolXAJRUaQ10YohOwECQboCxBStw8lpTcoN51J2AQDy0FTjZG4u
qvE3GulqejXlHNZBd+lqpdsV5hqf+dcVDQ==
=g+do
-----END PGP PRIVATE KEY BLOCK-----`
    }
    var password123 = "$2a$10$fTP6I9.t7Z4wlNm3E.Ex2.TwbYjRMIAmEsDQyMaFC5YRHY2UOk92K";
    var smeeMsg = `-----BEGIN PGP MESSAGE-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

wV4DmPpsKFcY+UISAQdAJHOoI24XMBNw4NwchS0RJyZxNdOVrokOU4l241/1
5XMwwCKuQNY6dxWplDZcsxncpmoX8d4gtxbDV05IjsVpzVSGAvAtZsuBcMHR
5lzZXYzo0lEBNPeWBKyO4Qf7s60XY0EpdVDNIeTDaTlqzK1bnSOwDGsDfWMU
QanViiZbfurOI55nSr0qF0AoRvQjYfUV8HFuP660Ka2+fzZX3Z5vt/bl6J0=
=Z7GM
-----END PGP MESSAGE-----
`;
    var ninkMsg = `-----BEGIN PGP MESSAGE-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

wV4Dyo3NEoX50ZoSAQdAKomboxwh3CfGJadSNIDoMsExUiUnCCxkTtHHbdxV
d20wI5VuwNMD/iN+onkglTRYCvBiWpuvTtXCMWZZlV22tUyYQe7w6LhjY7Hd
GB7dRTal0lEBTW1LR/ReIC4dID5O0+u5eUSRj12n2caE57SJkQt5+k0KPvOx
ZZmDD9eYtWw/Y6oKcOTTJ8f0qm6iuo8ifSCHozMKlK1Fa0uoUesQFg1J/XQ=
=UVFq
-----END PGP MESSAGE-----
`;
    var drooMsg = `-----BEGIN PGP MESSAGE-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

wV4D+UPf1p/rWf0SAQdA1qcCLft9w+CTo+ZFESf+FBdv9m1BfBCHk5I6JAZN
vwowJNU1UquiasDIjaFUrPyXOq+wiing9Si4UC/Qhtq7jnG0F5+7gsP52ctq
TeZo0Gm70lYBgSJ+yqGal/amCVWFg9d/baX5b7N4Zs35BBe5zZ+gGQGVwlEo
xZEzxul2Np7+cc88Ejb9Xt7JJ/sNZg+vezPX5EQrMDAePMMHatfb5MWWxZLw
svhUtw==
=k9z9
-----END PGP MESSAGE-----
`;
    var testPost1 = `<b>Lorem ipsum dolor sit amet, consectetur adipiscing elit. In tristique congue aliquet. Phasellus rutrum sit amet nisi sed lacinia. </b>Maecenas porta pulvinar vestibulum. Integer quis elit quam. <c>Etiam quis urna id lacus pulvinar tincidunt.</c> Quisque semper risus eget elit ornare, eu finibus lectus vulputate. Ut tortor leo, rutrum et facilisis et, imperdiet ut metus. Maecenas accumsan <i>fringilla lorem, vitae pretium ligula varius at.</i> Proin ex tellus, venenatis vehicula venenatis in, pulvinar eget ex.<br><br><img src="https://68.media.tumblr.com/708a562ba83f035812b6363558a79947/tumblr_o9h0kjFeB51vymizko1_1280.jpg"><br><br><u>Proin imperdiet libero turpis, sit amet iaculis</u> diam mattis vitae. Quisque ac nisl eget nibh euismod feugiat in ut erat. Nulla leo ligula, tristique vitae est ac, auctor efficitur sem. <ol><li>Maecenas pellentesque</li><li> sapien et maximus laoreet,</li></ol> magna nulla viverra <s>dui, ac ultrices velit nisi ut ligula. Integer pellentesque </s>nec nunc vel accumsan. Fusce vel eleifend arcu, vitae dignissim massa. Morbi vel interdum massa, quis consectetur nisi. Nullam mollis sed mi non accumsan.<br><br><a href="http://www.butts.cash/">butts.cash</a><br><br><ul><li>Phasellus</li><li> non turpis</li> <li>non libero</li> </ul>faucibus molestie non sit amet velit. Sed ornare commodo facilisis. Nullam ornare aliquet ultricies. Cras in maximus erat. Interdum et malesuada fames ac ante ipsum primis in faucibus. Donec lobortis turpis et mauris ullamcorper viverra.<br><cut>more</cut><br><r>Nullam pharetra suscipit nibh eget lacinia. Integer venenatis est et rhoncus ullamcorper. Sed sit amet enim velit. In tellus massa, iaculis ac libero in, sagittis mollis erat. Donec porttitor nunc at efficitur faucibus. Donec ut aliquet mauris. Etiam est justo, molestie lacinia congue at, fringilla sit amet ex.</r>`

    var mrah = {username:'mrah', password:password123, keys:smeeKeys, inbox:{
      threads:{
        '000000000000000000000002':{name:'droo', unread:true, key:drooKeys.pubKey, thread:[{inbound: false, date: "2018-07-09", body:smeeMsg},{inbound: false, date: "2018-07-10", body:drooMsg},{inbound: false, date: "2018-07-11", body:smeeMsg},{inbound: false, date: "2018-07-11", body:drooMsg}]},
      }, list:['000000000000000000000002'], updatedOn:'2018-08-06', pending:{}
    }}
    /*
    var posts = {};
    posts[tmrw] = [{body: testPost1}];
    posts[today] = [{body: testPost1}];
    posts[ystr] = [{body: testPost1}];
    var postList = [{date: ystr, num: 0},{date: today, num: 0}];
    var postListPending = [{date: tmrw, num: 0}];
    var testers = [
      {username:'smee', _id:ObjectId('000000000000000000000001'), password:password123, keys:smeeKeys, inbox:{
        threads:{
          '000000000000000000000002':{name:'droo', unread:true, key:drooKeys.pubKey, thread:[{inbound: false, date: "2018-07-09", body:smeeMsg},{inbound: false, date: "2018-07-10", body:smeeMsg},{inbound: false, date: "2018-07-11", body:smeeMsg},{inbound: false, date: "2018-07-11", body:smeeMsg}]},
        }, list:['000000000000000000000002'], updatedOn:today, pending:{}
      }, posts:posts, postList:postList, postListPending:postListPending, postListUpdatedOn:today, settings:{}},
      {username:'droo', _id:ObjectId('000000000000000000000002'), password:password123, keys:drooKeys, inbox:{
        threads: {
          '000000000000000000000001':{name:'smee', unread:true, key:smeeKeys.pubKey, thread:[{inbound: true, date: "2018-07-09", body:drooMsg},{inbound: true, date: "2018-07-10", body:drooMsg},{inbound: true, date: "2018-07-11", body:drooMsg},{inbound: true, date: "2018-07-11", body:drooMsg}]},
          '000000000000000000000004':{name:'shitnink', unread:true, key:ninkKeys.pubKey, thread:[{inbound: true, date: "2018-07-09", body:drooMsg},{inbound: false, date: "2018-07-10", body:drooMsg},{inbound: false, date: "2018-07-11", body:drooMsg},{inbound: true, date: "2018-07-11", body:drooMsg}]},
        }, list:['000000000000000000000001','000000000000000000000004'], updatedOn:today, pending:{}
      }, posts:posts, postList:postList, postListPending:postListPending, postListUpdatedOn:today, settings:{}},
      {username:'mrah', _id:ObjectId('000000000000000000000003'), password:password123, inbox:{
        threads: {}, list:[], updatedOn:today, pending:{}
      }, posts:posts, postList:postList, postListPending:postListPending, postListUpdatedOn:today, settings:{}},
      {username:'nink', _id:ObjectId('000000000000000000000004'), password:password123, keys:ninkKeys, inbox:{
        threads: {
          '000000000000000000000002':{name:'droo', unread:true, key:drooKeys.pubKey, thread:[{inbound: false, date: "2018-07-09", body:ninkMsg},{inbound: true, date: "2018-07-10", body:ninkMsg},{inbound: true, date: "2018-07-11", body:ninkMsg},{inbound: false, date: "2018-07-11", body:ninkMsg}]},
        }, list:['000000000000000000000002'], updatedOn:today, pending:{}
      }, posts:posts, postList:postList, postListPending:postListPending, postListUpdatedOn:today, settings:{}}
    ];
    */

    return mrah;
  }

}(typeof exports === 'undefined' ? this.adminB = {} : exports));
