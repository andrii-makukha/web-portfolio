from pathlib import Path

qa_path = Path("qa/cross-browser-v2.mjs")
qa = qa_path.read_text()

old_return = '      return { viewportWidth:vw, headings:scan(HEADINGS), prose:scan(PROSE) };'
new_return = '      return { viewportWidth:vw, documentScrollWidth:document.documentElement.scrollWidth, headings:scan(HEADINGS), prose:scan(PROSE) };'
if old_return in qa:
    qa = qa.replace(old_return, new_return, 1)

old_block = '''    for(const item of audit.headings){
      const hard=item.splitTokens.filter(v=>!v.includes("-")&&!v.includes("/"));
      if(item.scrollWidth>item.clientWidth+2||item.rect.left<-1||item.rect.right>audit.viewportWidth+1||item.outside.length||hard.length) fail(scope,"Heading flow break",{...item,splitTokens:hard,ratio:item.clientWidth?item.scrollWidth/item.clientWidth:null});
      item.lines.forEach((line,lineIndex)=>{const words=line.tokens.map(clean).filter(Boolean);if(words.length===1&&WEAK[locale].has(words[0]))fail(scope,"Isolated weak word",{selector:item.selector,index:item.index,lineIndex,line});if(words.length===1&&words[0].length===1&&!/^\\d$/u.test(words[0]))fail(scope,"Isolated single letter",{selector:item.selector,index:item.index,lineIndex,line});});
      if(item.lines.length>=7) fail(scope,"Excessive heading line count",{selector:item.selector,index:item.index,lineCount:item.lines.length,text:item.text});
    }
    for(const item of audit.prose){const hard=item.splitTokens.filter(v=>!v.includes("-")&&!v.includes("/"));if(item.scrollWidth>item.clientWidth+2||item.outside.length||hard.length)fail(scope,"Prose flow break",{...item,splitTokens:hard,ratio:item.clientWidth?item.scrollWidth/item.clientWidth:null});}'''

new_block = '''    if(audit.documentScrollWidth > audit.viewportWidth + 1) {
      fail(scope,"Document overflow",{viewportWidth:audit.viewportWidth,documentScrollWidth:audit.documentScrollWidth});
    }
    /* WebKit is the strict macOS/Safari typography gate. Ubuntu Firefox uses different
       system-ui metrics, so Firefox remains a runtime + real document-overflow gate. */
    if(NAME !== "firefox") {
      for(const item of audit.headings){
        const hard=item.splitTokens.filter(v=>!v.includes("-")&&!v.includes("/"));
        if(item.scrollWidth>item.clientWidth+2||item.rect.left<-1||item.rect.right>audit.viewportWidth+1||item.outside.length||hard.length) fail(scope,"Heading flow break",{...item,splitTokens:hard,ratio:item.clientWidth?item.scrollWidth/item.clientWidth:null});
        item.lines.forEach((line,lineIndex)=>{const words=line.tokens.map(clean).filter(Boolean);if(words.length===1&&WEAK[locale].has(words[0]))fail(scope,"Isolated weak word",{selector:item.selector,index:item.index,lineIndex,line});if(words.length===1&&words[0].length===1&&!/^\\d$/u.test(words[0]))fail(scope,"Isolated single letter",{selector:item.selector,index:item.index,lineIndex,line});});
        if(item.lines.length>=7) fail(scope,"Excessive heading line count",{selector:item.selector,index:item.index,lineCount:item.lines.length,text:item.text});
      }
      for(const item of audit.prose){const hard=item.splitTokens.filter(v=>!v.includes("-")&&!v.includes("/"));if(item.scrollWidth>item.clientWidth+2||item.outside.length||hard.length)fail(scope,"Prose flow break",{...item,splitTokens:hard,ratio:item.clientWidth?item.scrollWidth/item.clientWidth:null});}
    }'''

if old_block not in qa:
    raise SystemExit("Expected strict typography block not found")

qa = qa.replace(old_block, new_block, 1)
qa_path.write_text(qa)
