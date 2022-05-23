"use strict";

var tests = [ //array of arrays, each inner array contains two statements that are supposed to be equal
  [pool.userNameValidate(), "empty string is not a valid username, sorry", "pool.userNameValidate()"],
  [pool.userNameValidate(0), false, "pool.userNameValidate(0)"],
  [pool.userNameValidate('6as5df4'), false, "pool.userNameValidate('6as5df4')"],
  [pool.userNameValidate('AOEUHTS'), false, "pool.userNameValidate('AOEUHTS')"],
  [pool.userNameValidate('--__'), false, "pool.userNameValidate('--__')"],
  //#5
  [pool.userNameValidate('--__?'), `invalid name<br><br> valid characters include letters, numbers, "-" and "_"`, "pool.userNameValidate('--__?')"],
  [prepTextForRender("<b>buffalo</b>", 'id', 'preview').string, `<b><x id='id-0'>buffalo</x></b>`],
  [prepTextForRender("<u>buffalo <i>itals</i> buffalo <b>bolds</b> buffalo <code>code</code> buffalo <s>strike</s> buffalo</u>", 'id', 'preview').string, `<u><x id='id-0'>buffalo </x><i><x id='id-1'>itals</x></i><x id='id-2'> buffalo </x><b><x id='id-3'>bolds</x></b><x id='id-4'> buffalo </x><code><x id='id-5'>code</x></code><x id='id-6'> buffalo </x><s><x id='id-7'>strike</x></s><x id='id-8'> buffalo</x></u>`],
  [prepTextForRender(`before<br><note linkText="the button">the inner text<br></note><br>after`, 'id', 'preview').string, `<x id='id-0'>before</x><br><button class="special text-button" id="id-1" onclick="collapseNote('id-1','id-2', true, 'id')"><x id='id-3'>the button</x><icon id="id-2-note-top-plus" class="far fa-plus-square expand-button"></icon><icon id="id-2-note-top-minus" class="far fa-minus-square removed expand-button"></icon></button><innerNote class="removed" id="id-2"><x id='id-4'>the inner text</x><br><button onclick="collapseNote('id-1', 'id-2', false, 'id', true)" class="text-button collapse-button-bottom filter-focus" id="id-2-note-close"><icon class="far fa-minus-square"></icon></button></innerNote><br id="id-2-br"><x id='id-5'>after</x>`],
  [prepTextForRender(`<cut>a</cut>b`, 'id', 'preview').string, `<button class='text-button special' onclick='$("id-0").classList.remove("removed"); this.classList.add("removed");'><x id='id-1'>a</x><icon class="far fa-plus-square expand-button"></icon></button><innerCut id=id-0 class='removed'><x id='id-2'>b</x></innerCut>`],
  //#10
  [prepTextForRender(`<ol><li>a</li><ul><li>b</li></ol><li>c</li></ul>`, 'id', 'preview').string, `<ol><li><x id='id-0'>a</x></li><ul><li><x id='id-1'>b</x></li></ul></ol><li><x id='id-2'>c</x></li>`],
  [prepTextForRender(`<u><cut>x</cut><note linkText="a"><note linkText="b">c<br></note><br></note><br>d</u> e`, 'id', 'preview').string, `<u><button class='text-button special' onclick='$("id-0").classList.remove("removed"); this.classList.add("removed");'><x id='id-1'>x</x><icon class="far fa-plus-square expand-button"></icon></button><innerCut id=id-0 class='removed'><button class="special text-button" id="id-2" onclick="collapseNote('id-2','id-3', true, 'id')"><x id='id-4'>a</x><icon id="id-3-note-top-plus" class="far fa-plus-square expand-button"></icon><icon id="id-3-note-top-minus" class="far fa-minus-square removed expand-button"></icon></button><innerNote class="removed" id="id-3"><button class="special text-button" id="id-5" onclick="collapseNote('id-5','id-6', true, 'id')"><x id='id-7'>b</x><icon id="id-6-note-top-plus" class="far fa-plus-square expand-button"></icon><icon id="id-6-note-top-minus" class="far fa-minus-square removed expand-button"></icon></button><innerNote class="removed" id="id-6"><x id='id-8'>c</x><br><button onclick="collapseNote('id-5', 'id-6', false, 'id', true)" class="text-button collapse-button-bottom filter-focus" id="id-6-note-close"><icon class="far fa-minus-square"></icon></button></innerNote><br id="id-6-br"><button onclick="collapseNote('id-2', 'id-3', false, 'id', true)" class="text-button collapse-button-bottom filter-focus" id="id-3-note-close"><icon class="far fa-minus-square"></icon></button></innerNote><br id="id-3-br"><x id='id-9'>d</x></innerCut></u><x id='id-10'> e</x>`],
  [prepTextForRender(`a<hr>e`, 'id', 'preview').string, `<x id='id-0'>a</x><hr><x id='id-1'>e</x>`],
  [prepTextForRender(`<quote>test<br><r><a href="butts.cash">-cite</a><br></r></quote>`, 'id', 'preview').string, `<quote><x id='id-0'>test</x><br><r><a class='clicky special' target="_blank" href="/butts.cash"><x id='id-1'>-cite</x></a><br></r></quote>`],
  [prepTextForRender(`aoeu <b>uidh</b> htns`,`id`,null,{startElem:0, endElem:1, startOffset:2, endOffset:3}), `eu <b>uid</b>`],
  //#15
  [prepTextForRender(`aoeu <b>uidh</b> htns`,`id`,null,{startElem:1, endElem:1, startOffset:1, endOffset:3}), `<b>id</b>`],
  [prepTextForRender(`aoeu <b>uidh</b> htns`,`id`,null,{startElem:0, endElem:2, startOffset:2, endOffset:4}), `eu <b>uidh</b> htn`],
  [prepTextForRender(`<u><i><b><br><ul><ul><ul>how bout this shit?<br></ul>and<br></ul>here?<br></ul>here too<br></b></i></u>`, 'id',null,{startElem:0, endElem:3, startOffset:14, endOffset:2}), `<u><i><b><ul><ul><ul>shit?<br></ul>and<br></ul>here?<br></ul>he</b></i></u>`],
  [prepTextForRender(`ass pants <note linkText="abcdef">b<br></note><br><br>brububuhuub<br>`,`id`,null,{startElem:0, endElem:3, startOffset:4, endOffset:3}), `pants <note linkText="abc">b<br></note>`],
  [prepTextForRender(`ass pants <note linkText="abcdef">b<br></note><br><br>brububuhuub<br>`,`id`,null,{startElem:3, endElem:3, startOffset:1, endOffset:4}), `<note linkText="bcd">b<br></note>`],
  //#20
  [prepTextForRender(`pants <note linkText="abc">12345<br></note><br>hrum<br>`,`id`,null,{startElem:4, endElem:5, startOffset:1, endOffset:1}), `<note linkText="abc">2345<br></note><br>h`],
  [prepTextForRender(`pants <note linkText="abc">12345<br></note><br>hrum`,`id`,null,{startElem:4, endElem:5, startOffset:1, endOffset:1}), `<note linkText="abc">2345<br></note><br>h`],
  [prepTextForRender(`pants <note linkText="abc">12345<br></note> hrum`,`id`,null,{startElem:4, endElem:5, startOffset:3, endOffset:3}), `<note linkText="abc">45<br></note> hr`],
  [prepTextForRender(`pants <note linkText="abc"><b>12345</b><br></note> hrum`,`id`,null,{startElem:4, endElem:5, startOffset:3, endOffset:3}), `<note linkText="abc"><b>45</b><br></note> hr`],
  [prepTextForRender(`<i>pants <note linkText="abc">12345<br></note><br>hrum<br></i>`,`id`,null,{startElem:4, endElem:4, startOffset:1, endOffset:4}), `<i>234</i>`],
  // #25
  [deWeaveAndRemoveUnmatchedTags(`a <note linkText="b"></note>c</note> d`), `a <note linkText="b"></note>c d`],
  [deWeaveAndRemoveUnmatchedTags(`<ol><li>a</li><ul><li>b</li></ol><li>c</li></ul>`), `<ol><li>a</li><ul><li>b</li></ul></ol><li>c</li>`],
  [deWeaveAndRemoveUnmatchedTags(`pre <i><note linkText="open"></i>inner<br></note> post`), `pre <i><note linkText="open"></note></i>inner<br> post`],
  [deWeaveAndRemoveUnmatchedTags(``), ``],
  [prepTextForRender(`a<note linkText="b"></note>c</note>d<br>a<note linkText="b"></note>c</note>d`, 'id', 'preview').string, `<x id='id-0'>a</x><a class="clicky special" id="id-1" onclick="collapseNote('id-1','id-2', true, 'id')"><x id='id-3'>b</x><icon id="id-2-note-top-plus" class="far fa-plus-square expand-button"></icon><icon id="id-2-note-top-minus" class="far fa-minus-square removed expand-button"></icon></a><innerNote class="removed" id="id-2"><clicky onclick="collapseNote('id-1', 'id-2', false, 'id')" class="collapse-button-top"><icon class="far fa-minus-square"></icon></clicky><clicky onclick="collapseNote('id-1', 'id-2', false, 'id', true)" class="collapse-button-bottom hidden" id="id-2-note-close"><icon class="far fa-minus-square"></icon></clicky></innerNote><x id='id-4'>cd</x><br><x id='id-5'>a</x><a class="clicky special" id="id-6" onclick="collapseNote('id-6','id-7', true, 'id')"><x id='id-8'>b</x><icon id="id-7-note-top-plus" class="far fa-plus-square expand-button"></icon><icon id="id-7-note-top-minus" class="far fa-minus-square removed expand-button"></icon></a><innerNote class="removed" id="id-7"><clicky onclick="collapseNote('id-6', 'id-7', false, 'id')" class="collapse-button-top"><icon class="far fa-minus-square"></icon></clicky><clicky onclick="collapseNote('id-6', 'id-7', false, 'id', true)" class="collapse-button-bottom hidden" id="id-7-note-close"><icon class="far fa-minus-square"></icon></clicky></innerNote><x id='id-9'>cd</x>`],
  // #30
  [prepTextForRender(`pre <note linkText="abc">123<b>456</b><br></note> aft`,`id`,null,{startElem:5, endElem:6, startOffset:1, endOffset:2}), `<note linkText="abc"><b>56</b><br></note> a`],
  [prepTextForRender(`pre <note linkText="abc">123<b>456</b><br></note> aft`,`id`,null,{startElem:4, endElem:6, startOffset:2, endOffset:3}), `<note linkText="abc">3<b>456</b><br></note> af`],
  [prepTextForRender(`pre <note linkText="abc"><u>123</u><b>456</b><br></note> aft`,`id`,null,{startElem:4, endElem:5, startOffset:1, endOffset:2}), `<u>23</u><b>45</b>`],
  [prepTextForRender(`<u>pre <note linkText="abc"><i>123456</i><br></note> aft</u>`,`id`,null,{startElem:4, endElem:4, startOffset:2, endOffset:4}), `<u><i>34</i></u>`],
  [prepTextForRender(`pre <note linkText="abc"><i><u><b><s>123456</s></b></u></i><br></note> aft`,`id`,null,{startElem:4, endElem:5, startOffset:4, endOffset:2}), `<note linkText="abc"><i><u><b><s>56</s></b></u></i><br></note> a`],
  // #35
  [prepTextForRender(`pre <note linkText="abc">123<b>456</b><br></note> aft`,`id`,null,{startElem:4, endElem:5, startOffset:1, endOffset:2}), `23<b>45</b>`],
  [prepTextForRender(`pre <note linkText="<u><i>abc</i> <b>def</b></u>">123<b>456</b><br></note> aft`,`id`,null,{startElem:5, endElem:6, startOffset:1, endOffset:2}), `<note linkText="<u><b>ef</b></u>">12</note>`],
  [prepTextForRender(`pre <note linkText="<u><i>abc</i> <b>def</b></u>">123<b>456</b><br></note> aft`,`id`,null,{startElem:5, endElem:8, startOffset:1, endOffset:2}), `<note linkText="<u><b>ef</b></u>">123<b>456</b><br></note> a`],
  [prepTextForRender(`pre <note linkText="abc"><u>1<i>23</i><b>45</b>6</u><br></note> aft`,`id`,null,{startElem:0, endElem:8, startOffset:2, endOffset:2}), `e <note linkText="abc"><u>1<i>23</i><b>45</b>6</u><br></note> a`],
  [prepTextForRender(`<quote>pre1 <note linkText="butt1">pre2 <note linkText="butt2">pre3 <note linkText="butt3">inner<br></note> aft3<br></note> aft2<br></note> aft1<br><r><a href="/~/MHtRiSo">-goob</a></r></quote>`,`id`,null,{startElem:0, endElem:8, startOffset:2, endOffset:2}), `<quote>e1 <note linkText="butt1">pre2 <note linkText="butt2">pr</note></note><r><a href="/~/MHtRiSo">-goob</a></r></quote>`],
  // #40
  [prepTextForRender(`pre1 <note linkText="butt1">pre2 <note linkText="butt2">pre3 <note linkText="butt3">i<u>n</u>ne<i>r</i><br></note> aft3<br></note> aft2<br></note> aft1`,`id`,null,{startElem:4, endElem:11, startOffset:3, endOffset:2}), `2 <note linkText="butt2">pre3 <note linkText="bu">i<u>n</u>ne<i>r</i><br></note></note>`],
  [prepTextForRender(`pre1 <note linkText="butt1">pre2 <note linkText="butt2">pre3 <note linkText="butt3">i<u>n</u>ne<i>r</i><br></note> aft3<br></note> aft2<br></note> aft1`,`id`,null,{startElem:0, endElem:17, startOffset:3, endOffset:3}), `1 <note linkText="butt1">pre2 <note linkText="butt2">pre3 <note linkText="butt3">i<u>n</u>ne<i>r</i><br></note> aft3<br></note> af</note>`],
  [prepTextForRender(`pre1 <note linkText="butt1">pre2 <note linkText="butt2">pre3 <note linkText="butt3">i<u>n</u>ne<i>r</i><br></note> aft3<br></note> aft2<br></note> aft1`,`id`,null,{startElem:4, endElem:17, startOffset:2, endOffset:3}), `e2 <note linkText="butt2">pre3 <note linkText="butt3">i<u>n</u>ne<i>r</i><br></note> aft3<br></note> af`],
  [prepTextForRender(`pre1 <note linkText="butt1">pre2 <note linkText="butt2">pre3 <note linkText="butt3">i<u>n</u>ne<i>r</i><br></note> aft3<br></note> aft2<br></note> aft1`,`id`,null,{startElem:7, endElem:7, startOffset:1, endOffset:3}), `<note linkText="ut">pre3 <note linkText="butt3">i<u>n</u>ne<i>r</i><br></note> aft3<br></note>`],
  [prepTextForRender(`pre1 <note linkText="butt1">pre2 <note linkText="butt2">pre3 <note linkText="butt3">i<u>n</u>ne<i>r</i><br></note> aft3<br></note> aft2<br></note> aft1`,`id`,null,{startElem:10, endElem:17, startOffset:6, endOffset:1}).error, `selection not found`],
  // #45
  [prepTextForRender(`pre<br><l><cut>butt</cut>hide<br></l>aft`,`id`,null,{startElem:0, endElem:0, startOffset:1, endOffset:2}), `r`],
  [prepTextForRender(`pre<br><l><cut>butt</cut>hide<br></l>aft`,`id`,null,{startElem:0, endElem:2, startOffset:1, endOffset:2}), `re<br><l><cut>bu</cut></l>`],
  [prepTextForRender(`pre<br><l><cut>butt</cut>hide<br></l>aft`,`id`,null,{startElem:0, endElem:4, startOffset:1, endOffset:2}), `re<br><l><cut>butt</cut>hide<br></l>af`],
  [prepTextForRender(`pre<br><l><cut>butt</cut>hide<br></l>aft`,`id`,null,{startElem:2, endElem:2, startOffset:0, endOffset:4}), `<l><cut>butt</cut></l>`],
  [prepTextForRender(`pre<br><l><cut>butt</cut>hide<br></l>aft`,`id`,null,{startElem:2, endElem:4, startOffset:2, endOffset:1}), `<l><cut>tt</cut>hide<br></l>a`],
  // #50
  [prepTextForRender(`pre<br><l><cut>butt</cut>hide<br></l>aft`,`id`,null,{startElem:3, endElem:3, startOffset:1, endOffset:3}), `<l>id</l>`],
  [prepTextForRender(`pre<br><l><cut>butt</cut>hide<br></l>aft`,`id`,null,{startElem:0, endElem:3, startOffset:1, endOffset:2}), `re<br><l><cut>butt</cut>hi</l>`],
  [prepTextForRender(`pre<br><l><cut>butt</cut>hide<br></l>aft`,`id`,null,{startElem:3, endElem:4, startOffset:2, endOffset:2}), `<l>de<br></l>af`],
  [prepTextForRender(`pre<br><l><cut>butt</cut>hide<br></l>aft`,`id`,null,{startElem:4, endElem:4, startOffset:1, endOffset:3}), `ft`],
  [prepTextForRender(`pre <cut><i>cut1</i>Butt</cut><note linkText="<s><u>note1Butt</u></s>"><cut><i>cut2</i>B<b>utt</b></cut><u>elde<s>rado</s></u><note linkText="note2Butt"><li>guadalupe</li></note><br></note> aft`,`id`,null,{startElem:16, endElem:16, startOffset:0, endOffset:9}), `<li>guadalupe</li>`],
  // #55
  [prepTextForRender(`pre <cut><i>cut1</i>Butt</cut><note linkText="<s><u>note1Butt</u></s>"><cut><i>cut2</i>B<b>utt</b></cut><u>elde<s>rado</s></u><note linkText="note2Butt"><li>guadalupe</li></note><br></note> aft`,`id`,null,{startElem:0, endElem:17, startOffset:1, endOffset:3}), `re <cut><i>cut1</i>Butt</cut><note linkText="<s><u>note1Butt</u></s>"><cut><i>cut2</i>B<b>utt</b></cut><u>elde<s>rado</s></u><note linkText="note2Butt"><li>guadalupe</li></note><br></note> af`],
  [prepTextForRender(`pre<br><l><cut><i>cut1</i>Butt</cut><note linkText="<cut>trick</cut><s><u>note1Butt</u></s>"><cut><i>cut2</i>B<b>utt</b></cut><u>elde<s>rado</s></u><note linkText="note2Butt"><li>guadalupe</li></note><br></note><br></l>aft`,`id`,null,{startElem:0, endElem:19, startOffset:1, endOffset:2}), `re<br><l><cut><i>cut1</i>Butt</cut><note linkText="<cut>trick</cut><s><u>note1Butt</u></s>"><cut><i>cut2</i>B<b>utt</b></cut><u>elde<s>rado</s></u><note linkText="note2Butt"><li>guadalupe</li></note><br></note><br></l>af`],
  [prepTextForRender(`pre<br><l><cut><i>cut1</i>Butt</cut><note linkText="<cut>trick</cut><s><u>note1Butt</u></s>"><cut><note linkText="<i>cut2</i>B<b>utt</b>">impossibleText<br></note></cut><u>elde<s>rado</s></u><note linkText="note2Butt"><li>guadalupe</li></note><br></note><br></l>aft`,`id`,null,{startElem:12, endElem:14, startOffset:1, endOffset:2}), `<l><cut><note linkText="<i>ut2</i>B<b>ut</b>">impossibleText<br></note></cut></l>`],
  [prepTextForRender(`pre<br><l><cut><i>cut1</i>Butt</cut><note linkText="<cut>trick</cut><s><u>note1Butt</u></s>"><cut><note linkText="<i>cut2</i>B<b>utt</b>">impossibleText<br></note></cut><u>elde<s>rado</s></u><note linkText="note2Butt"><li>guadalupe</li></note><br></note><br></l>aft`,`id`,null,{startElem:7, endElem:7, startOffset:1, endOffset:5}), `<l><note linkText="<cut>rick</cut>"><cut><note linkText="<i>cut2</i>B<b>utt</b>">impossibleText<br></note></cut><u>elde<s>rado</s></u><note linkText="note2Butt"><li>guadalupe</li></note><br></note></l>`],
  [prepTextForRender(`pre <cut><note linkText="butt">inaccessible<br></note></cut>hidden`,`id`,null,{startElem:0, endElem:6, startOffset:2, endOffset:1}), `e <cut><note linkText="butt">inaccessible<br></note></cut>h`],
  // #60
  [prepTextForRender(`pre <cut><note linkText="butt">inaccessible<br></note></cut>hidden`,`id`,null,{startElem:0, endElem:4, startOffset:2, endOffset:1}), `e <cut><note linkText="b">inaccessible<br></note></cut>`],
  [prepTextForRender(`pre <cut><note linkText="butt">inaccessible<br></note></cut>hidden`,`id`,null,{startElem:4, endElem:4, startOffset:2, endOffset:4}), `<cut><note linkText="tt">inaccessible<br></note></cut>`],
  [prepTextForRender(`<note linkText="<u>123</u>">abc</note>`,`id`,null,{startElem:2, endElem:3, startOffset:2, endOffset:1}), `<note linkText="<u>3</u>">a</note>`],
  [prepTextForRender(`pre<br><quote><note linkText="<u>123</u>">abc</note><br></quote>aft`,`id`,null,{startElem:0, endElem:3, startOffset:2, endOffset:1}), `e<br><quote><note linkText="<u>1</u>">abc</note></quote>`],
  [prepTextForRender(`pre<br><quote><note linkText="<u>123</u>">abc</note><br></quote>aft`,`id`,null,{startElem:3, endElem:5, startOffset:2, endOffset:1}), `<quote><note linkText="<u>3</u>">abc</note><br></quote>a`],
  // #65
  [prepTextForRender(`pre<br><quote><note linkText="123">abc</note><br></quote>aft`,`id`,null,{startElem:3, endElem:5, startOffset:2, endOffset:1}), `<quote><note linkText="3">abc</note><br></quote>a`],
  [prepTextForRender(`pre1 <note linkText="butt1">pre2 <note linkText="butt2">pre3 <note linkText="butt3">i<u>n</u>ne<i>r</i><br></note> aft3<br></note> aft2<br></note> aft1`,`id`,null,{startElem:14, endElem:16, startOffset:1, endOffset:3}), `<note linkText="butt3">e<i>r</i><br></note> af`],
  [prepTextForRender(`pre1 <note linkText="butt1">pre2 <note linkText="butt2">pre3 <note linkText="butt3">i<u>n</u>ne<i>r</i><br></note> aft3<br></note> aft2<br></note> aft1`,`id`,null,{startElem:16, endElem:17, startOffset:3, endOffset:3}), `<note linkText="butt2">t3<br></note> af`],
  [prepTextForRender(`<note linkText="<s><u>note1Butt</u></s>">fartButt<br></note>`,`id`,null,{startElem:2, endElem:2, startOffset:5, endOffset:9}), `<note linkText="<s><u>Butt</u></s>">fartButt<br></note>`],
  [prepTextForRender(`<s><u><note linkText="note1Butt">fartButt</note></u></s>`,`id`,null,{startElem:2, endElem:2, startOffset:5, endOffset:9}), `<s><u><note linkText="Butt">fartButt</note></u></s>`],
  // #70
  [prepTextForRender(`<note linkText="<s>note1Butt</s>">fartButt<br></note>`,`id`,null,{startElem:2, endElem:3, startOffset:5, endOffset:4}), `<note linkText="<s>Butt</s>">fart</note>`],
  [prepTextForRender(`<u><note linkText="<s>note1Butt</s>">fartButt<br></note></u>`,`id`,null,{startElem:2, endElem:2, startOffset:5, endOffset:9}), `<u><note linkText="<s>Butt</s>">fartButt<br></note></u>`],
  [prepTextForRender(`pre1 <note linkText="butt1">pre2 <note linkText="butt2">pre3 <note linkText="butt3">i<u>n</u>ne<i>r</i><br></note> aft3<br></note> aft2<br></note> aft1`,`id`,null,{startElem:3, endElem:11, startOffset:2, endOffset:2}), `<note linkText="tt1">pre2 <note linkText="butt2">pre3 <note linkText="bu">i<u>n</u>ne<i>r</i><br></note></note></note>`],
  [prepTextForRender(`<note linkText="<u>note1Butt</u>"><i>fartButt</i><br></note>`,`id`,null,{startElem:3, endElem:3, startOffset:0, endOffset:4}), `<i>fart</i>`],
  [prepTextForRender(`<note linkText="<i>note</i>B<b>utt</b>">inner<br></note>`,`id`,null,{startElem:2, endElem:4, startOffset:1, endOffset:2}), `<note linkText="<i>ote</i>B<b>ut</b>">inner<br></note>`],
  // #75
  [prepTextForRender(`<note linkText="<i>note</i>B<b>utt</b>">inner<br></note>`,`id`,null,{startElem:2, endElem:5, startOffset:2, endOffset:2}), `<note linkText="<i>te</i>B<b>utt</b>">in</note>`],
  [prepTextForRender(`<i><u><note linkText="<s><u>no<b>te1Bu</b>tt</u></s>">fartButt<br></note></u></i>`,`id`,null,{startElem:3, endElem:4, startOffset:3, endOffset:2}), `<i><u><note linkText="<s><u><b>Bu</b>tt</u></s>">fartButt<br></note></u></i>`],
  [convertImgTagsToLinks(`<img src="https://i.imgur.com/AXo44un.jpg"><img src="https://i.imgur.com/hDEXSt7.jpg" title="frip" alt="frup">`), `<a href="https://i.imgur.com/AXo44un.jpg">https://i.imgur.com/AXo44un.jpg</a><a href="https://i.imgur.com/hDEXSt7.jpg">https://i.imgur.com/hDEXSt7.jpg</a>`],
  [convertImgTagsToLinks(`<img src="https://i.imgur.com/AXo44un.jpg">aoeu<img src="https://i.imgur.com/hDEXSt7.jpg" title="frip" alt="frup">`), `<a href="https://i.imgur.com/AXo44un.jpg">https://i.imgur.com/AXo44un.jpg</a>aoeu<a href="https://i.imgur.com/hDEXSt7.jpg">https://i.imgur.com/hDEXSt7.jpg</a>`],
  [convertImgTagsToLinks(`<img src="https://i.imgur.com/AXo44un.jpg"><br><img src="https://i.imgur.com/hDEXSt7.jpg" title="frip" alt="frup">`), `<a href="https://i.imgur.com/AXo44un.jpg">https://i.imgur.com/AXo44un.jpg</a><br><a href="https://i.imgur.com/hDEXSt7.jpg">https://i.imgur.com/hDEXSt7.jpg</a>`],
  // #80
  [convertImgTagsToLinks(`<a href="https://i.imgur.com/AXo44un.jpg">https://i.imgur.com/AXo44un.jpg</a><br><a href="https://i.imgur.com/hDEXSt7.jpg">https://i.imgur.com/hDEXSt7.jpg</a>`), `<a href="https://i.imgur.com/AXo44un.jpg">https://i.imgur.com/AXo44un.jpg</a><br><a href="https://i.imgur.com/hDEXSt7.jpg">https://i.imgur.com/hDEXSt7.jpg</a>`],
  [prepTextForRender(`pre <a href="https://www.schlaugh.com">linkText</a> aft`,`id`,null,{startElem:0, endElem:2, startOffset:0, endOffset:4}), `pre <a href="https://www.schlaugh.com">linkText</a> aft`],
  [prepTextForRender(`pre <a href="https://www.schlaugh.com">linkText</a> aft`,`id`,null,{startElem:1, endElem:2, startOffset:0, endOffset:4}), `<a href="https://www.schlaugh.com">linkText</a> aft`],
  [prepTextForRender(`pre <a href="https://www.schlaugh.com">linkText</a> aft`,`id`,null,{startElem:1, endElem:1, startOffset:3, endOffset:8}), `<a href="https://www.schlaugh.com">kText</a>`],
  [prepTextForRender(`pre <a href="https://www.schlaugh.com">linkText</a> aft`,`id`,null,{startElem:0, endElem:1, startOffset:2, endOffset:4}), `e <a href="https://www.schlaugh.com">link</a>`],
  // #85
  [prepTextForRender(`<a href="https://www.schlaugh.com">linkText</a> aft`,`id`,null,{startElem:0, endElem:1, startOffset:4, endOffset:2}), `<a href="https://www.schlaugh.com">Text</a> a`],
  [prepTextForRender(`<a href="https://www.schlaugh.com">linkText</a> aft`,`id`,null,{startElem:0, endElem:1, startOffset:0, endOffset:4}), `<a href="https://www.schlaugh.com">linkText</a> aft`],
  [prepTextForRender(`<a href="https://www.schlaugh.com">linkText</a> aft`,`id`,null,{startElem:0, endElem:0, startOffset:0, endOffset:8}), `<a href="https://www.schlaugh.com">linkText</a>`],
  [prepTextForRender(`<note linkText="">bubba gubba<br></note><br>krubi deli`,`id`,null,{startElem:3, endElem:3, startOffset:6, endOffset:10}), `deli`],
  [prepTextForRender(`<quote><quote><quote>ccc<br><r>-scr3<br></r></quote>bbb<br><r>-scr2<br></r></quote>aaa<br><r>-scr1<br></r></quote>`,`id`,null,{startElem:0, endElem:0, startOffset:1, endOffset:2}), "<quote><quote><quote>c<r>-scr3<br></r></quote><r>-scr2<br></r></quote><r>-scr1<br></r></quote>"],
  // #90
  [prepTextForRender(`<quote>aaa<br><quote><quote>ccc<br><r>-scr3<br></r></quote>bbb<br><r>-scr2<br></r></quote>aaa<br><r>-scr1<br></r></quote>`,`id`,null,{startElem:0, endElem:0, startOffset:1, endOffset:3}), "<quote>aa<r>-scr1<br></r></quote>"],
  [prepTextForRender(`<quote><quote>bbb<br><r><a href="/~/">-src2</a></r></quote>aaa<br><r>-scr1</r></quote>`,`id`,null,{startElem:2, endElem:2, startOffset:1, endOffset:2}), "<quote>a<r>-scr1</r></quote>"],
  [prepTextForRender(`&lt;3`,`id`,null,{startElem:0, endElem:0, startOffset:0, endOffset:2}), "<3"],
  [prepTextForRender(`123<note>aaaa</note>456`,`id`,null,{startElem:0, endElem:4, startOffset:2, endOffset:1}), "3<note>aaaa</note>4"],
  [prepTextForRender(`123<note>aaaa</note>456`,`id`,null,{startElem:4, endElem:4, startOffset:0, endOffset:1}), "4"],
  // #95
  [prepTextForRender(`123<note>aaaa</note>456`,`id`,null,{startElem:0, endElem:3, startOffset:2, endOffset:1}), "3<note>a</note>"],
  [prepTextForRender(`123<note>aaaa</note>456`,`id`,null,{startElem:3, endElem:4, startOffset:3, endOffset:1}), "<note>a</note>4"],
  [prepTextForRender(`123<note>aaaa</note>456`,`id`,null,{startElem:3, endElem:3, startOffset:1, endOffset:3}), "aa"],
  [prepTextForRender(`123<note linkText="">aaaa</note>456`,`id`,null,{startElem:0, endElem:4, startOffset:2, endOffset:1}), `3<note linkText="">aaaa</note>4`],
  [prepTextForRender(`123<note linkText="">aaaa</note>456`,`id`,null,{startElem:4, endElem:4, startOffset:0, endOffset:1}), "4"],
  // #100
  [prepTextForRender(`123<note linkText="">aaaa</note>456`,`id`,null,{startElem:0, endElem:3, startOffset:2, endOffset:1}), `3<note linkText="">a</note>`],
  [prepTextForRender(`123<note linkText="">aaaa</note>456`,`id`,null,{startElem:3, endElem:4, startOffset:3, endOffset:1}), `<note linkText="">a</note>4`],
  [prepTextForRender(`123<note linkText="">aaaa</note>456`,`id`,null,{startElem:3, endElem:3, startOffset:1, endOffset:3}), "aa"],
  [prepTextForRender(`bipo <code><code></code> zipo`,`id`,null,{startElem:0, endElem:2, startOffset:3, endOffset:2}), "o <code><code></code> z"],
  [prepTextForRender(`<quote>test<br><r><a href="http://butts.cash">-cite</a><br></r></quote>`, 'id', 'preview').string, `<quote><x id='id-0'>test</x><br><r><a class='clicky special ex-link' target="_blank" href="http://butts.cash"><x id='id-1'>-cite</x></a><br></r></quote>`],
  // #105
  [unConvertCodes(convertCodes(`<code>&lt; <code> <<<&& a</code>`)), `<code>&lt; <code> <<<&& a</code>`],
  [prepTextForRender(`<nonTag>abcdefg<nonTag>1234`,`id`,null,{startElem:0, endElem:0, startOffset:10, endOffset:13}), "cde"],
  [prepTextForRender(`<nonTag>abcdefg<nonTag>1234`,`id`,null,{startElem:0, endElem:0, startOffset:19, endOffset:22}), "Tag"],
  [prepTextForRender(`<nonTag>abcdefg<nonTag>1234`,`id`,null,{startElem:0, endElem:0, startOffset:22, endOffset:26}), ">123"],
  [prepTextForRender(`abc <code><code></code> def`,`id`,null,{startElem:1, endElem:1, startOffset:1, endOffset:5}), "<code>code</code>"],
  // 110
  [prepTextForRender(`abc <code><code></code> def`,`id`,null,{startElem:0, endElem:1, startOffset:2, endOffset:4}), "c <code><cod</code>"],
  [prepTextForRender(`abc <code><code></code> def`,`id`,null,{startElem:1, endElem:2, startOffset:4, endOffset:2}), "<code>e></code> d"],
  [prepTextForRender(`abc <code><<<<<<<<code></code> defaoeu`,`id`,null,{startElem:2, endElem:2, startOffset:3, endOffset:6}), "fao"],
  [prepTextForRender(`<u><i><butt></i></u>`,`id`,null,{startElem:0, endElem:0, startOffset:1, endOffset:5}), "butt"],
]

/* this is a test of the cryption stuff, but it's asynch,
                            so figure out how to put it in the tester...
makeKeys('password', function (key) {
  encrypt("mmeessssaaggee", key.pubKey, function (crypt) {
    decrypt(crypt, decryptPrivKey('password', key.privKey), function (text) {
      console.log(text);
    });
  });
});
*/

var displayTests = function (results) {
  if (typeof results === "string") {
    $('test-title').innerHTML = results;
  } else {
    $('test-title').innerHTML = "failing tests:";
    var bucket = document.createElement("ul");
    for (var i = 0; i < results.length; i++) {
      var x = document.createElement("li");
      x.innerHTML = results[i][0] + ".  " + results[i][2]+" === "+results[i][1];
      bucket.appendChild(x);
    }
    $('test-results').appendChild(bucket);
  }
}

var getUsers = function () {
  ajaxCall('/admin/users', 'POST', {text:$('data-field').value}, function(json) {
    console.log(json);
  });
}

var getPost = function () {
  ajaxCall('/admin/getPost', 'POST', {_id: $("id-of-post-to-get").value}, function(json) {
    console.log(json);
  });
}

var getResetCodes = function () {
  ajaxCall('/admin/resetCodes', 'POST', {}, function(json) {
    console.log(json);
  });
}

var getErrorLogs = function () {
  ajaxCall('/admin/errorLogs', 'POST', {}, function(json) {
    console.log(json);
  });
}

var getDbStats = function () {
  ajaxCall('/admin/getDbStats', 'POST', {}, function(json) {
    // console.log(json);
    var readUnits = 0;
    var writeUnits = 0;
    for (var i = 0; i < 32; i++) {
      readUnits += json[(json.length - 1) - i].read;
      writeUnits += json[(json.length - 1) - i].write;
    }
    console.log("since " +json[(json.length - 1) - 31]._id + "(inclusive):\n readUnits: "+readUnits+"\n writeUnits: "+writeUnits);
  });
}

var getStats = function () {
  ajaxCall('/admin/stats', 'POST', {}, function(json) {
    console.log(json);
    var latest = json[json.length-1];
    console.log(latest._id +": "+ String(latest.signUps) +" of "+ String(latest.rawLoads-latest.logIns))
  });
}

var getUserUrls = function () {
  ajaxCall('/admin/userUrls', 'POST', {}, function(json) {
    console.log(json);
  });
}

var getSessions = function () {
  ajaxCall('/admin/getSessions', 'POST', {}, function(json) {
    console.log(json);
  });
}

var getUser = function (id) {
  if (id) {
    ajaxCall('/admin/user', 'POST', {id: $("get-user-by-id-input").value}, function(json) {
      console.log(json);
    });
  } else {
    ajaxCall('/admin/user', 'POST', {name: $("get-user-input").value}, function(json) {
      console.log(json);
    });
  }
}

var getSchlaunquerMatches = function () {
  ajaxCall('/admin/schlaunquer', 'POST', {}, function(json) {
    console.log(json);
  });
}

var getTagsOfDate = function () {
  ajaxCall('/admin/getTagsOfDate', 'POST', {date: $('date-of-tags').value}, function(json) {
    console.log(json);
  });
}
var getTag = function () {
  ajaxCall('/admin/getTag', 'POST', {tag: $('name-of-tag').value}, function(json) {
    console.log(json);
  });
}
