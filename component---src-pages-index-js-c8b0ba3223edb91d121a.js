(window.webpackJsonp=window.webpackJsonp||[]).push([[2],{194:function(e,t,a){"use strict";a.r(t),a.d(t,"query",(function(){return d}));a(198);var r=a(0),i=a.n(r),n=a(197),s=a(202),o=a(200),l=a.n(o);t.default=function(e){var t=e.data;return i.a.createElement(s.a,null,i.a.createElement("div",null,i.a.createElement("div",{style:{marginTop:"1em"}},t.allMarkdownRemark.edges.map((function(e){var t=e.node;return i.a.createElement("div",{key:t.id,style:{clear:"left",marginBottom:"1em",borderBottom:"solid 1px teal"}},i.a.createElement(n.a,{to:t.frontmatter.path,style:{textDecoration:"none",color:"inherit"}},i.a.createElement("div",null,i.a.createElement("div",{style:{float:"left"}},i.a.createElement(l.a,{fixed:t.frontmatter.thumbnailImage.childImageSharp.fixed}))),i.a.createElement("div",{style:{paddingLeft:"6em"}},i.a.createElement("h3",{style:{marginBottom:"-0.25em",color:"#585858"}},t.frontmatter.title),i.a.createElement("div",{style:{color:"teal"}},t.frontmatter.series),i.a.createElement("div",{style:{color:"#BBB",marginBottom:"1em"}},t.frontmatter.date))))})))))};var d="542621248"},196:function(e,t,a){var r;e.exports=(r=a(199))&&r.default||r},197:function(e,t,a){"use strict";var r=a(0),i=a.n(r),n=a(65),s=a.n(n);a.d(t,"a",(function(){return s.a}));a(196),a(7).default.enqueue,i.a.createContext({})},198:function(e,t,a){"use strict";a(201)("fixed",(function(e){return function(){return e(this,"tt","","")}}))},199:function(e,t,a){"use strict";a.r(t);a(18);var r=a(0),i=a.n(r),n=a(92);t.default=function(e){var t=e.location,a=e.pageResources;return a?i.a.createElement(n.a,Object.assign({location:t,pageResources:a},a.json)):null}},200:function(e,t,a){"use strict";a(31),a(23),a(13),a(66),a(130),a(198);var r=a(14);t.__esModule=!0,t.default=void 0;var i,n=r(a(67)),s=r(a(68)),o=r(a(131)),l=r(a(132)),d=r(a(0)),c=r(a(49)),u=function(e){var t=(0,l.default)({},e),a=t.resolutions,r=t.sizes,i=t.critical;return a&&(t.fixed=a,delete t.resolutions),r&&(t.fluid=r,delete t.sizes),i&&(t.loading="eager"),t.fluid&&(t.fluid=S([].concat(t.fluid))),t.fixed&&(t.fixed=S([].concat(t.fixed))),t},f=function(e){var t=e.fluid,a=e.fixed;return(t&&t[0]||a&&a[0]).src},g=Object.create({}),m=function(e){var t=u(e),a=f(t);return g[a]||!1},p="undefined"!=typeof HTMLImageElement&&"loading"in HTMLImageElement.prototype,h="undefined"!=typeof window,b=h&&window.IntersectionObserver,y=new WeakMap;function v(e){return e.map((function(e){var t=e.src,a=e.srcSet,r=e.srcSetWebp,i=e.media,n=e.sizes;return d.default.createElement(d.default.Fragment,{key:t},r&&d.default.createElement("source",{type:"image/webp",media:i,srcSet:r,sizes:n}),d.default.createElement("source",{media:i,srcSet:a,sizes:n}))}))}function S(e){var t=[],a=[];return e.forEach((function(e){return(e.media?t:a).push(e)})),[].concat(t,a)}function E(e){return e.map((function(e){var t=e.src,a=e.media,r=e.tracedSVG;return d.default.createElement("source",{key:t,media:a,srcSet:r})}))}function w(e){return e.map((function(e){var t=e.src,a=e.media,r=e.base64;return d.default.createElement("source",{key:t,media:a,srcSet:r})}))}function L(e,t){var a=e.srcSet,r=e.srcSetWebp,i=e.media,n=e.sizes;return"<source "+(t?"type='image/webp' ":"")+(i?'media="'+i+'" ':"")+'srcset="'+(t?r:a)+'" '+(n?'sizes="'+n+'" ':"")+"/>"}var I=function(e,t){var a=(void 0===i&&"undefined"!=typeof window&&window.IntersectionObserver&&(i=new window.IntersectionObserver((function(e){e.forEach((function(e){if(y.has(e.target)){var t=y.get(e.target);(e.isIntersecting||e.intersectionRatio>0)&&(i.unobserve(e.target),y.delete(e.target),t())}}))}),{rootMargin:"200px"})),i);return a&&(a.observe(e),y.set(e,t)),function(){a.unobserve(e),y.delete(e)}},R=function(e){var t=e.src?'src="'+e.src+'" ':'src="" ',a=e.sizes?'sizes="'+e.sizes+'" ':"",r=e.srcSet?'srcset="'+e.srcSet+'" ':"",i=e.title?'title="'+e.title+'" ':"",n=e.alt?'alt="'+e.alt+'" ':'alt="" ',s=e.width?'width="'+e.width+'" ':"",o=e.height?'height="'+e.height+'" ':"",l=e.crossOrigin?'crossorigin="'+e.crossOrigin+'" ':"",d=e.loading?'loading="'+e.loading+'" ':"",c=e.draggable?'draggable="'+e.draggable+'" ':"";return"<picture>"+e.imageVariants.map((function(e){return(e.srcSetWebp?L(e,!0):"")+L(e)})).join("")+"<img "+d+s+o+a+r+t+n+i+l+c+'style="position:absolute;top:0;left:0;opacity:1;width:100%;height:100%;object-fit:cover;object-position:center"/></picture>'},x=function(e){var t=e.src,a=e.imageVariants,r=e.generateSources,i=e.spreadProps,n=d.default.createElement(O,(0,l.default)({src:t},i));return a.length>1?d.default.createElement("picture",null,r(a),n):n},O=d.default.forwardRef((function(e,t){var a=e.sizes,r=e.srcSet,i=e.src,n=e.style,s=e.onLoad,c=e.onError,u=e.loading,f=e.draggable,g=(0,o.default)(e,["sizes","srcSet","src","style","onLoad","onError","loading","draggable"]);return d.default.createElement("img",(0,l.default)({sizes:a,srcSet:r,src:i},g,{onLoad:s,onError:c,ref:t,loading:u,draggable:f,style:(0,l.default)({position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"},n)}))}));O.propTypes={style:c.default.object,onError:c.default.func,onLoad:c.default.func};var C=function(e){function t(t){var a;(a=e.call(this,t)||this).seenBefore=h&&m(t),a.isCritical="eager"===t.loading||t.critical,a.addNoScript=!(a.isCritical&&!t.fadeIn),a.useIOSupport=!p&&b&&!a.isCritical&&!a.seenBefore;var r=a.isCritical||h&&(p||!a.useIOSupport);return a.state={isVisible:r,imgLoaded:!1,imgCached:!1,fadeIn:!a.seenBefore&&t.fadeIn},a.imageRef=d.default.createRef(),a.handleImageLoaded=a.handleImageLoaded.bind((0,n.default)(a)),a.handleRef=a.handleRef.bind((0,n.default)(a)),a}(0,s.default)(t,e);var a=t.prototype;return a.componentDidMount=function(){if(this.state.isVisible&&"function"==typeof this.props.onStartLoad&&this.props.onStartLoad({wasCached:m(this.props)}),this.isCritical){var e=this.imageRef.current;e&&e.complete&&this.handleImageLoaded()}},a.componentWillUnmount=function(){this.cleanUpListeners&&this.cleanUpListeners()},a.handleRef=function(e){var t=this;this.useIOSupport&&e&&(this.cleanUpListeners=I(e,(function(){var e=m(t.props);t.state.isVisible||"function"!=typeof t.props.onStartLoad||t.props.onStartLoad({wasCached:e}),t.setState({isVisible:!0},(function(){return t.setState({imgLoaded:e,imgCached:!!t.imageRef.current.currentSrc})}))})))},a.handleImageLoaded=function(){var e,t,a;e=this.props,t=u(e),a=f(t),g[a]=!0,this.setState({imgLoaded:!0}),this.props.onLoad&&this.props.onLoad()},a.render=function(){var e=u(this.props),t=e.title,a=e.alt,r=e.className,i=e.style,n=void 0===i?{}:i,s=e.imgStyle,o=void 0===s?{}:s,c=e.placeholderStyle,f=void 0===c?{}:c,g=e.placeholderClassName,m=e.fluid,p=e.fixed,h=e.backgroundColor,b=e.durationFadeIn,y=e.Tag,S=e.itemProp,L=e.loading,I=e.draggable,C=!1===this.state.fadeIn||this.state.imgLoaded,V=!0===this.state.fadeIn&&!this.state.imgCached,z=(0,l.default)({opacity:C?1:0,transition:V?"opacity "+b+"ms":"none"},o),k="boolean"==typeof h?"lightgray":h,T={transitionDelay:b+"ms"},j=(0,l.default)({opacity:this.state.imgLoaded?0:1},V&&T,{},o,{},f),N={title:t,alt:this.state.isVisible?"":a,style:j,className:g};if(m){var B=m,P=B[0];return d.default.createElement(y,{className:(r||"")+" gatsby-image-wrapper",style:(0,l.default)({position:"relative",overflow:"hidden"},n),ref:this.handleRef,key:"fluid-"+JSON.stringify(P.srcSet)},d.default.createElement(y,{style:{width:"100%",paddingBottom:100/P.aspectRatio+"%"}}),k&&d.default.createElement(y,{title:t,style:(0,l.default)({backgroundColor:k,position:"absolute",top:0,bottom:0,opacity:this.state.imgLoaded?0:1,right:0,left:0},V&&T)}),P.base64&&d.default.createElement(x,{src:P.base64,spreadProps:N,imageVariants:B,generateSources:w}),P.tracedSVG&&d.default.createElement(x,{src:P.tracedSVG,spreadProps:N,imageVariants:B,generateSources:E}),this.state.isVisible&&d.default.createElement("picture",null,v(B),d.default.createElement(O,{alt:a,title:t,sizes:P.sizes,src:P.src,crossOrigin:this.props.crossOrigin,srcSet:P.srcSet,style:z,ref:this.imageRef,onLoad:this.handleImageLoaded,onError:this.props.onError,itemProp:S,loading:L,draggable:I})),this.addNoScript&&d.default.createElement("noscript",{dangerouslySetInnerHTML:{__html:R((0,l.default)({alt:a,title:t,loading:L},P,{imageVariants:B}))}}))}if(p){var q=p,W=q[0],M=(0,l.default)({position:"relative",overflow:"hidden",display:"inline-block",width:W.width,height:W.height},n);return"inherit"===n.display&&delete M.display,d.default.createElement(y,{className:(r||"")+" gatsby-image-wrapper",style:M,ref:this.handleRef,key:"fixed-"+JSON.stringify(W.srcSet)},k&&d.default.createElement(y,{title:t,style:(0,l.default)({backgroundColor:k,width:W.width,opacity:this.state.imgLoaded?0:1,height:W.height},V&&T)}),W.base64&&d.default.createElement(x,{src:W.base64,spreadProps:N,imageVariants:q,generateSources:w}),W.tracedSVG&&d.default.createElement(x,{src:W.tracedSVG,spreadProps:N,imageVariants:q,generateSources:E}),this.state.isVisible&&d.default.createElement("picture",null,v(q),d.default.createElement(O,{alt:a,title:t,width:W.width,height:W.height,sizes:W.sizes,src:W.src,crossOrigin:this.props.crossOrigin,srcSet:W.srcSet,style:z,ref:this.imageRef,onLoad:this.handleImageLoaded,onError:this.props.onError,itemProp:S,loading:L,draggable:I})),this.addNoScript&&d.default.createElement("noscript",{dangerouslySetInnerHTML:{__html:R((0,l.default)({alt:a,title:t,loading:L},W,{imageVariants:q}))}}))}return null},t}(d.default.Component);C.defaultProps={fadeIn:!0,durationFadeIn:500,alt:"",Tag:"div",loading:"lazy"};var V=c.default.shape({width:c.default.number.isRequired,height:c.default.number.isRequired,src:c.default.string.isRequired,srcSet:c.default.string.isRequired,base64:c.default.string,tracedSVG:c.default.string,srcWebp:c.default.string,srcSetWebp:c.default.string,media:c.default.string}),z=c.default.shape({aspectRatio:c.default.number.isRequired,src:c.default.string.isRequired,srcSet:c.default.string.isRequired,sizes:c.default.string.isRequired,base64:c.default.string,tracedSVG:c.default.string,srcWebp:c.default.string,srcSetWebp:c.default.string,media:c.default.string});C.propTypes={resolutions:V,sizes:z,fixed:c.default.oneOfType([V,c.default.arrayOf(V)]),fluid:c.default.oneOfType([z,c.default.arrayOf(z)]),fadeIn:c.default.bool,durationFadeIn:c.default.number,title:c.default.string,alt:c.default.string,className:c.default.oneOfType([c.default.string,c.default.object]),critical:c.default.bool,crossOrigin:c.default.oneOfType([c.default.string,c.default.bool]),style:c.default.object,imgStyle:c.default.object,placeholderStyle:c.default.object,placeholderClassName:c.default.string,backgroundColor:c.default.oneOfType([c.default.string,c.default.bool]),onLoad:c.default.func,onError:c.default.func,onStartLoad:c.default.func,Tag:c.default.string,itemProp:c.default.string,loading:c.default.oneOf(["auto","lazy","eager"]),draggable:c.default.bool};var k=C;t.default=k},201:function(e,t,a){var r=a(1),i=a(8),n=a(30),s=/"/g,o=function(e,t,a,r){var i=String(n(e)),o="<"+t;return""!==a&&(o+=" "+a+'="'+String(r).replace(s,"&quot;")+'"'),o+">"+i+"</"+t+">"};e.exports=function(e,t){var a={};a[e]=t(o),r(r.P+r.F*i((function(){var t=""[e]('"');return t!==t.toLowerCase()||t.split('"').length>3})),"String",a)}},202:function(e,t,a){"use strict";var r=a(0),i=a.n(r),n=a(197),s=function(e){return i.a.createElement("div",null,i.a.createElement("header",{style:{marginBottom:"-1rem",paddingLeft:"10px",backgroundColor:"#008080",textAlign:e.textAlign}},i.a.createElement(n.a,{to:"/",style:{textShadow:"none",backgroundImage:"none",textDecoration:"none",color:"white"}},i.a.createElement("h3",{style:{display:"inline",fontFamily:"Courier New"}},"Seb Carss"))),i.a.createElement("nav",{style:{marginTop:"1.5em",textAlign:"center"}},i.a.createElement("div",null)))};t.a=function(e){var t=e.children;return i.a.createElement("div",null,i.a.createElement(s,{textAlign:"center"}),i.a.createElement("div",{style:{margin:"0 auto",maxWidth:650,padding:"1.25rem 1rem"}},t))}}}]);
//# sourceMappingURL=component---src-pages-index-js-c8b0ba3223edb91d121a.js.map