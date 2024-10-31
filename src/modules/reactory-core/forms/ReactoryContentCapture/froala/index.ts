const htmlAllowedTags = ['reactory', 'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'keygen', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'menu', 'menuitem', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'pre', 'progress', 'queue', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'style', 'section', 'select', 'small', 'source', 'span', 'strike', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr']
const htmlAllowedAttrs = ['reactory-.*', 'accept', 'accept-charset', 'accesskey', 'action', 'align', 'allowfullscreen', 'allowtransparency', 'alt', 'aria-.*', 'async', 'autocomplete', 'autofocus', 'autoplay', 'autosave', 'background', 'bgcolor', 'border', 'charset', 'cellpadding', 'cellspacing', 'checked', 'cite', 'class', 'color', 'cols', 'colspan', 'content', 'contenteditable', 'contextmenu', 'controls', 'coords', 'data', 'data-.*', 'datetime', 'default', 'defer', 'dir', 'dirname', 'disabled', 'download', 'draggable', 'dropzone', 'enctype', 'for', 'form', 'formaction', 'frameborder', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'http-equiv', 'icon', 'id', 'ismap', 'itemprop', 'keytype', 'kind', 'label', 'lang', 'language', 'list', 'loop', 'low', 'max', 'maxlength', 'media', 'method', 'min', 'mozallowfullscreen', 'multiple', 'muted', 'name', 'novalidate', 'open', 'optimum', 'pattern', 'ping', 'placeholder', 'playsinline', 'poster', 'preload', 'pubdate', 'radiogroup', 'readonly', 'rel', 'required', 'reversed', 'rows', 'rowspan', 'sandbox', 'scope', 'scoped', 'scrolling', 'seamless', 'selected', 'shape', 'size', 'sizes', 'span', 'src', 'srcdoc', 'srclang', 'srcset', 'start', 'step', 'summary', 'spellcheck', 'style', 'tabindex', 'target', 'title', 'type', 'translate', 'usemap', 'value', 'valign', 'webkitallowfullscreen', 'width', 'wrap']
const htmlAllowedEmptyTags = ['reactory', 'textarea', 'a', 'iframe', 'object', 'video', 'style', 'script', '.fa', '.fr-emoticon', '.fr-inner', 'path', 'line', 'hr'];

export const froalaOptions = {
  imageManagerLoadMethod: 'GET',
  toolbarInline: false,
  toolbarVisibleWithoutSelection: false,
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  htmlAllowedTags,
  htmlAllowedAttrs,
  htmlAllowedEmptyTags,
  toolbarButtons: {
    'moreText': {
      'buttons': ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontFamily', 'fontSize', 'textColor', 'backgroundColor', 'inlineClass', 'inlineStyle', 'clearFormatting']
    },
    'moreParagraph': {
      'buttons': ['alignLeft', 'alignCenter', 'formatOLSimple', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'paragraphStyle', 'lineHeight', 'outdent', 'indent', 'quote']
    },
    'moreRich': {
      'buttons': ['insertLink', 'insertImage', 'insertVideo', 'insertTable', 'emoticons', 'fontAwesome', 'specialCharacters', 'embedly', 'insertFile', 'insertHR']
    },
    'moreMisc': {
      'buttons': ['undo', 'redo', 'fullscreen', 'print', 'getPDF', 'spellChecker', 'selectAll', 'html', 'help'],
    }
  },

  fileUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.reactory.CLIENT_KEY}',
    'x-client-pwd': '${formContext.reactory.CLIENT_PWD}',
  },
};

export const minmalOptions = {
  imageManagerLoadMethod: 'GET',
  toolbarInline: false,
  toolbarVisibleWithoutSelection: false,
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  htmlAllowedTags,
  htmlAllowedAttrs,
  htmlAllowedEmptyTags,
  toolbarButtons: {
    'moreText': {
      'buttons': ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontFamily', 'fontSize', 'textColor', 'backgroundColor', 'inlineClass', 'inlineStyle', 'clearFormatting']
    },
    'moreParagraph': {
      'buttons': ['alignLeft', 'alignCenter', 'formatOLSimple', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'paragraphStyle', 'lineHeight', 'outdent', 'indent', 'quote']
    },
    'moreRich': {
      'buttons': ['insertLink', 'insertImage', 'insertVideo', 'insertTable', 'emoticons', 'fontAwesome', 'specialCharacters', 'embedly', 'insertFile', 'insertHR']
    },
    'moreMisc': {
      'buttons': ['undo', 'redo', 'fullscreen', 'print', 'getPDF', 'spellChecker', 'selectAll', 'html', 'help'],
    }
  },
  fileUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.reactory.CLIENT_KEY}',
    'x-client-pwd': '${formContext.reactory.CLIENT_PWD}',
  },
  quickInsertEnabled: false,
};

export const minmalExtendedOptions = {
  imageManagerLoadMethod: 'GET',
  toolbarInline: false,
  toolbarVisibleWithoutSelection: false,
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  htmlAllowedTags,
  htmlAllowedAttrs,
  htmlAllowedEmptyTags,
  toolbarButtons: {
    'moreText': {
      'buttons': ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontFamily', 'fontSize', 'textColor', 'backgroundColor', 'inlineClass', 'inlineStyle', 'clearFormatting']
    },
    'moreParagraph': {
      'buttons': ['alignLeft', 'alignCenter', 'formatOLSimple', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'paragraphStyle', 'lineHeight', 'outdent', 'indent', 'quote']
    },
    'moreRich': {
      'buttons': ['insertLink', 'insertImage', 'insertVideo', 'insertTable', 'emoticons', 'fontAwesome', 'specialCharacters', 'embedly', 'insertFile', 'insertHR']
    },
    'moreMisc': {
      'buttons': ['undo', 'redo', 'fullscreen', 'print', 'getPDF', 'spellChecker', 'selectAll', 'html', 'help'],
    }
  },
  fileUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.reactory.CLIENT_KEY}',
    'x-client-pwd': '${formContext.reactory.CLIENT_PWD}',
  },
  quickInsertEnabled: true,
};

export const inlineFroalaOptions = {
  imageManagerLoadMethod: 'GET',
  toolbarInline: true,
  toolbarVisibleWithoutSelection: true,
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  htmlAllowedTags,
  htmlAllowedAttrs,
  htmlAllowedEmptyTags,
  htmlDoNotWrapTags: ['script', 'style', 'reactory'],
  htmlExecuteScripts: true,
  toolbarButtons: {
    'moreText': {
      'buttons': ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontFamily', 'fontSize', 'textColor', 'backgroundColor', 'inlineClass', 'inlineStyle', 'clearFormatting']
    },
    'moreParagraph': {
      'buttons': ['alignLeft', 'alignCenter', 'formatOLSimple', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'paragraphStyle', 'lineHeight', 'outdent', 'indent', 'quote']
    },
    'moreRich': {
      'buttons': ['insertLink', 'insertImage', 'insertVideo', 'insertTable', 'emoticons', 'fontAwesome', 'specialCharacters', 'embedly', 'insertFile', 'insertHR']
    },
    'moreMisc': {
      'buttons': ['undo', 'redo', 'fullscreen', 'print', 'getPDF', 'spellChecker', 'selectAll', 'html', 'help'],
    }
  },
  fileUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.reactory.CLIENT_KEY}',
    'x-client-pwd': '${formContext.reactory.CLIENT_PWD}',
  },
  quickInsertEnabled: true,
};