# Snitch

Snitch is a small script library that uses [PhantomJS 1.2](http://www.phantomjs.org/) (or later) to headlessly analyze web pages. Snitch is forked from [confess.js](https://github.com/jamesgpearce/confess) and [loadreport](https://github.com/wesleyhales/loadreport).



## Examples

```
phantomjs snitch.js http://nsl.cs.usc.edu
```

Column headers are resource id, start time, blocking time, total load time and resource bytes.
```
Loadtime: 335 numresources: 16 totalresourcebytes: 59075 loading: 205 interactive: 225 onload: 309
1 0 163 171 12795 http://nsl.cs.usc.edu/
2 167 13 14 17174 http://nsl.cs.usc.edu/pub/skins/skittlish/base.css
3 168 27 27 2878 http://nsl.cs.usc.edu/pub/skins/skittlish/app.js
4 169 29 29 1286 http://nsl.cs.usc.edu/pub/attachtable/attachtable.css
...
```
   
Take a screenshot of the loaded page 
```
phantomjs snitch.js http://nsl.cs.usc.edu --screenshot /home/dudeguy/screenshot.png
```
