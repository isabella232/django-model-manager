{"result": "ok", "data":
[
{"host":"jedna", "service": "apache", "relations":[{"host":"dva","service":"hovno"}]},
{"host":"jedna", "service": "nginx", "relations":[{"host":"dva","service":"hovno3"}]},
{"host": "dva", "service": "hovno", "relations":[{"host":"dva","service":"hovno2"}]},
{"host": "dva", "service": "hovno2", "relations":[{"host":"dva","service":"hovno3"}]},
{"host": "dva", "service": "hovno3", "relations":[]},
{"host": "tri", "service": "hovno", "relations":[{"host":"dva","service":"hovno2"}]},
{"host": "tri", "service": "hovno2", "relations":[{"host":"dva","service":"hovno3"}]},
{"host": "tri", "service": "hovno3", "relations":[]}
]}