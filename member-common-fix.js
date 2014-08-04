/*! 2014 BilibiliHack In BALTHASAR */


/*投稿*/
function postVideo(mode,tid){
	this.submitMode = typeof(mode)!="undefined"?mode:"";
	this.loading = 0;
	this.codeMode = false;
	this.stateMsg = new MessageBox();
	this.msgTarget = null;
	this.tid = typeof(tid)!="undefined"?tid:-1;
	this.allowLocal = typeof(local_up)!="undefined"?local_up:false;
	this.promote = true;
	this.list = [];
	this.init();
}
postVideo.prototype = {
	strCount:bindStrLenCount,
	tips:bindToolTips,
	emm:new ErrMsgManage(),
	upload_query:{},
	TYPES:{
		SINA:{
			value:"sina",
			name:"新浪"
		},
		YOUKU:{
			value:"youku",
			name:"优酷"
		},
		QQ:{
			value:"qq",
			name:"腾讯"
		},
		Letv:{
			value:"letv",
			name:"乐视"
		},
		VUPLOAD:{
			value:"localup",
			name:"直传"
		}
	},
	addTemplate:null,
	init:function(){
		var pv = this;
		pv.mode = $("#comefrom").length>0?"submit":"edit";
		pv.addTemplate = '<li class="add-video clearfix">'+
					'<div class="control-btn-select" style="width: 65px;"><span>选择</span><select class="slt_src_type"><option value="0" selected="selected" disabled="disabled">选择</option></select></div>'+
					'<input type="text" class="control-inpt-input url" style="width: 155px; margin-left:7px;" /><input type="text" class="control-inpt-input pagename" style="width: 95px; margin-left:7px;" /><textarea class="control-inpt-input desc auto-size" style="width: 240px; margin-left: 7px;"></textarea><a id="add_video" class="btn simple" style="margin-left:7px;">添加</a>'+
				'</li>';
		pv.strCount.bind($("#title"),40);
		pv.strCount.bind($("#description"),200);
		$("#odi_list .add-video").remove();
		pv.initType(pv.tid);

		$("#mission_id").change(function(){
			var target = $(this);
			$.ajax("/video_submit.do?act=mission_help&msid="+target.val(), {
				success:function(data){
					pv.tips.show(target,data,"r");
				}
			});
		});

		var suggest_func = {
			source: function( request, response ) {
				var tmp_term_lst = request.term.split(",");
				
				$.getJSON( "/suggest?jsoncallback=?", {
					term: tmp_term_lst[tmp_term_lst.length-1].replace(/　/g,""),
					rnd:Math.random()
				}, response );
			},
			search: function() {
				// custom minLength
				this.value=this.value.replace(/，/g,",");
				var term = this.value;
				var tmp_term_lst = term.split(",");
				if (tmp_term_lst[tmp_term_lst.length-1].length < 1) return false;
				
				if ( term.charCodeAt(0)<255 && term.length < 1 || term.length>40) {
					return false;
				}
			},
			focus: function() {
				// prevent value inserted on focus
				return false;
			},
			select: function( event, ui ) {
				var tmp_term_lst = this.value.split(",");
				_value = "";
				if (tmp_term_lst.length > 1)
				{
					for (i=0;i<tmp_term_lst.length-1;i++)
					{
						_value+=tmp_term_lst[i]+",";
					}
				}
				_value+=ui.item.value;
				this.value = _value;
				// $("#searchform").submit();
				return false;
			}
		};
		if ($("#tags").length){
			$("#tags").attr("autocomplete","off");
			$("#tags").autocomplete(suggest_func)
				.data( "autocomplete" )._renderItem = function( ul, item ) {
				return $( "<li></li>" )
					.data( "item.autocomplete", item )
					.append( "<a style=\"text-align:left\">" + item.value + "<em style=\"float:right;font-size:10px;\""+(item.match ? " title=\"(Match Token: "+item.match+")\"" : "")+">" + (item.desc ? item.desc : item.ref + "个")+"</em></a>" )
					.appendTo( ul );
				};
		}
		$( "#multiP_sortable" ).sortable({ 
			items: "li.item",
			cancel:"li.uploading,select,.swfupload,input,textarea,a",
			change:function(e,ui){
				pv.buildList();
			}
		});

		var addControl = pv.initAddControl();

		$('<i class="i">上传认证已经过代码强化，支持乐视UV发布，并支持跳过转码等待</i><br />').insertBefore($("#content_url_page").parents("li").find(".item-l i.i"));
		if(pv.allowLocal&&pv.promote){
			var pic = $('<div><a><img style="display: block;margin: 30px auto 0;" src="http://static.hdslb.com/images/member_v2/uploadpic.jpg"/></a></div>').insertBefore("#single_item");
			pic.click(function(){
				pv.manuallyPost();
				$("#content_url_page").parents("li").prependTo(".form-post > ul");
				$('[value="'+pv.TYPES.VUPLOAD.value+'"]',addControl).attr("selected",true);
				$(".slt_src_type",addControl).change();
			});
		}

		function _hashchange(){
			for(var i in pv.upload_query){
				if(pv.upload_query[i].uploading||pv.upload_query[i].requesting){
					if(confirm("有视频正在上传")){
						$(".side-navi a[href]").off("click",_hashchange);
						return true;
					} else{
						return false;
					}
				}
			}
			$(".side-navi a[href]").off("click",_hashchange);
			window.onbeforeunload = function(){};
		}
		$(".side-navi a[href]").click(_hashchange);
		if(pv.mode=="submit"){
			pv.infoRecover();
		}
	},
	queryCheck:function(){
		var pv = this;
		for(var i in pv.upload_query){
			if(pv.upload_query[i].uploading||pv.upload_query[i].requesting){
				return false;
			}
		}
		window.onbeforeunload = function(){};
		return true;
	},
	initAddControl:function(){
		var pv = this;
		var add_control = $(pv.addTemplate).appendTo("#multiP_sortable");
		pv.strCount.bind($(".add-video .desc"),200);
		pv.initSelectObj(add_control);
		pv.bindTypeChange(add_control);
		$("#add_video",add_control).off("click");
		$("#add_video",add_control).click(function(){
			var item = $(this).parent();
			var info = pv.checkVideoItemInfo(item,"add");
			if(info){
				pv.addP(info.url,info.src_type,info.description,info.pagename);
				item.find("input,textarea").val("");
			}
		});
		return add_control;
	},
	initSelectObj:function(obj){
		var pv = this;
		for(var t in pv.TYPES){
			if(t=="VUPLOAD"&&!pv.allowLocal) {
				continue;
			}
			var option = $('<option value="'+pv.TYPES[t].value+'">'+pv.TYPES[t].name+'</option>').appendTo($(".slt_src_type",obj));
		}
	},
	initType:function(tid){
		var pv = this;
		var selectMain = $('<div class="control-btn-select" style="width: 120px;clear: both; ">'+
										'<span>请选择</span><select id="typeid_main"><option value=0 selected disabled="disabled">请选择</option></select></div>');
		var selectSub = $('<div class="control-btn-select" style="width: 150px;clear: both; margin-left:15px;">'+
								'<span>请选择</span><select name="typeid" id="typeid"><option value=0 selected disabled="disabled">请选择</option></select></div>');
		selectMain.appendTo($("#lanmu"));
		selectSub.appendTo($("#lanmu"));
		function createSub(sel,data){
			$("select",selectSub).empty();
			$("span",selectSub).html("请选择");
			var def_opt = $('<option value=0 selected>请选择</option>').appendTo($("select",selectSub));
			for(var j = 0;j<data[sel.val()].length;j++){
				var opt;
				if(data[data[sel.val()][j].tid]){
					opt = $('<option disabled="disabled" value='+data[sel.val()][j].tid+'>'+data[sel.val()][j].typename+'</option>').appendTo($("select",selectSub));
					for(var k = 0;k<data[data[sel.val()][j].tid].length;k++){
						var opt_sub = $('<option value='+data[data[sel.val()][j].tid][k].tid+'>　├'+data[data[sel.val()][j].tid][k].typename+'</option>').appendTo($("select",selectSub));
					}
				} else{
					opt = $('<option value='+data[sel.val()][j].tid+'>'+data[sel.val()][j].typename+'</option>').appendTo($("select",selectSub));
				}
			}
			def_opt.attr("disabled",true);
			selectInit();
		}
		var mainTid = 0;
		function checkTid(data,tid){
			for(i in data){
				for(var j = 0;j<data[i].length;j++){
					if(data[i][j].tid==tid&&i!=0){
						mainTid = i;
						checkTid(data,i);
					}
				}
			}
			return mainTid;
		}
		$.ajax({
			url:"/js/types.json",
			dataType:"json",
			success:function(data){
				for(var i = 0;i<data[0].length;i++){
					var opt = $('<option value='+data[0][i].tid+'>'+data[0][i].typename+'</option>').appendTo($("select",selectMain));
				}

				$("select",selectMain).change(function(){
					var sel = $(this);
					createSub(sel,data);
				});
				if(tid!=-1){
					var mTid = checkTid(data,tid);
					$("option[value="+mTid+"]",selectMain).attr("selected",true);
					$("select",selectMain).trigger("change");
					$("option[value="+tid+"]",selectSub).attr("selected",true);
					$("select",selectSub).trigger("change");
				}
				$("#typeid").change(function(){
					var vt_id = $(this).val();
					if (vt_id==33 || vt_id==32 || vt_id==94)
					{
						pv.tips.show($(this),"新番请依照 <b>【XX月/生肉/OVA等】新番名字 XX【字幕组】</b> 填写标题","r",400);
					}else if (vt_id == 40)
					{
						pv.tips.show($(this),"<b>视频带有一定理论基础相关的自主研究，制作，开发，改造等原创视频。</b>","r",400);
					}else
					{
						pv.tips.remove();
					}
				});
				$("#typeid_main").change(function(){
					pv.tips.remove();
				});
			}
		});
	},
	fastPost:function(item){
		var pv = this;
		pv.submitMode="multi";
		var url = $("input.url",item).val();
		var src_type = pv.checkUrl(url,item);
		if(!src_type) return false;
		pv.msgTarget = $("input.url",item);
		pv.getVideoInfo(url);
		return true;
	},
	manuallyPost:function(){
		$(".m_layer").remove();
		$("#step_1").hide();
		$("#step_2").show();
		pv.submitMode="multi";
		$("#content_url_page").show();
		$("#code_mode").show();
		location.hash = "video_submit&next&sub";
	},
	checkUrl:function(url,item,emm){
		var pv = this;
		var src_type = "";
		if(url.indexOf("v.youku.com")>=0){
			src_type=pv.TYPES.YOUKU.value;
		} else if(url.indexOf("video.sina.com.cn")>=0){
			src_type=pv.TYPES.SINA.value;
		} else if(url.indexOf("v.qq.com")>=0){
			src_type=pv.TYPES.QQ.value;
		} else{
			if(typeof(emm)!="undefined"){
				emm.showErrMsg($("input.url",item),"请填写正确的地址");
			} else{
				new MessageBox().showEx($("input.url",item),"请填写正确的地址",0,"error");
			}
			return false;
		}
		return src_type;
	},
	getVideoInfo:function(url){
		var pv = this;
		if(pv.stateMsg.bindobj!=null&&pv.stateMsg.bindobj.attr("hasmessagebox")!="") {
			//pv.stateMsg.close();
			return;
		}
		pv.stateMsg = new MessageBox();
		pv.stateMsg.showLoading(pv.msgTarget,"加载中",0);
		pv.loading = 1;
		var timeout = setTimeout(function(){
			if(pv.loading==1){
				pv.stateMsg.close();
				pv.stateMsg.show(pv.msgTarget,"网络超时");
			}
		},10000);
		$.ajax({
            url:"/getinfo",
            data:{ url:url },
            success:function(data){
            	clearTimeout(timeout);
                if(!data.error_code&&data.video_url){
                	pv.stateMsg.close();
                    var info = {
                        url:data.video_url,
	                    src_type:data.video_type,
	                    title:data.title,
	                    cover:data.cover,
	                    tags:data.keywords,
	                    description:data.description
                    };
                    pv.fillVideoInfo(info);
                } else{
                	pv.stateMsg.close();
                	pv.stateMsg = new MessageBox();
                	pv.stateMsg.show(pv.msgTarget,"信息获取失败");
                	//pv.stateMsg.change("信息获取失败",2000);
                }
                pv.loading = 0;
            },
			error:function() {
				clearTimeout(timeout);
				pv.stateMsg.close();
            	pv.stateMsg = new MessageBox();
            	pv.stateMsg.show(pv.msgTarget,"信息加载失败");
                pv.loading = 0;
			}
		});
	},
	getVideoTypeName:function(video_type){
		if(video_type=="youku"){
			return "优酷";
		} else if(video_type=="sina"){
			return "新浪";
		} else if(video_type=="qq"){
			return "腾讯";
		} else if(video_type=="letv"){
			return "乐视";
		} else if(video_type=="localup"){
			return "直传";
		} else{
			return "";
		}
	},
	fillVideoInfo:function(info,mode){
		var pv = this;
		$("#step_1").hide();
		$("#step_2").show();
		location.hash = "video_submit&next&sub";
		var target = $("#content_url_page");
		target.attr("video-type",info.src_type);
		target.attr("video-link",info.url);
		$("#title").val(info.title);
		$("#imghead").attr("src",info.cover);
		$("#litpic").val(info.cover);
		$("#tags").val(info.tags);
		$("#description").val(info.description);
		pv.addP(info.url,info.src_type,"","");
		target.show();
	},
	checkVideoItemInfo:function(item,mode,emm){
		var pv = this;
		var url = $("input.url",item).val();
		var slt_src_type = $(".slt_src_type",item);
		var src_type = slt_src_type.val();
		var repeat = 0;
		$("#multiP_sortable .item").each(function(i,e){
			var e = $(e);
			if (i!=item.index() && src_type != pv.TYPES.VUPLOAD.value && src_type == e.find(".slt_src_type").val() && url==e.find(".url").val()){
				if(typeof(emm)!="undefined"){
					emm.showErrMsg($("input.url",item),"视频源重复");
				} else{
					new MessageBox().showEx($("input.url",item),"视频源重复",0,"error");
				}
				repeat++;
				return false;
			}
		});
		if(repeat>0) return false;
		if(src_type=="0"){
			if(typeof(emm)!="undefined"){
				emm.showErrMsg(slt_src_type,"请选择视频源类别");
			} else{
				new MessageBox().showEx(slt_src_type,"请选择视频源类别",0,"error");
			}
			return false;
		}
		if(src_type!=pv.TYPES.VUPLOAD.value&&!url||src_type==pv.TYPES.VUPLOAD.value&&$(".upload_wrapper",item).length>0&&!$(".fn",item).attr("selected")){
			var url_target = $("input.url",item),timeout = 0,url_msg = "请填写视频源地址";
			if(src_type==pv.TYPES.VUPLOAD.value){
				url_target = $(".upload_wrapper",item);
				url_msg = "请上传文件";
				timeout = 1500;
			}
			if(typeof(emm)!="undefined"){
				emm.showErrMsg(url_target,url_msg,timeout);
			} else{
				new MessageBox().showEx(url_target,url_msg,timeout,"error");
			}
			return false;
		}
		if(pv.submitMode=="single") {
			return {
				url:url,
				src_type:src_type
			};
		}
		var length = $("#multiP_sortable li.item").length;
		var pagename = $("input.pagename",item).val();
		if(pagename==""&&length>0){
			if(mode=="add"&&length>=1){
				$("#multiP_sortable li.item").each(function(i,e){
					var e = $(e);
					if(!$(".pagename",e).val()){
						$(".pagename",e).val("P"+(i+1));
					}
				});
			}
            pagename = mode=="add"?"P"+(length+1):(length>1?"P"+(item.index()+1):"");
        }
		var description = $("textarea.desc",item).val();

		if(description.length>200){
			if(typeof(emm)!="undefined"){
				emm.showErrMsg($("textarea.desc",item),"简介请不要超过200字");
			} else{
				new MessageBox().showEx($("textarea.desc",item),"简介请不要超过200字",0,"error");
			}
			return false;
		}
		var info = {
			url:url,
			src_type:src_type,
			pagename:pagename,
			description:description
		}
		return info;
	},
	checkForm:function(){
		var pv = this;
		var emm = pv.emm;
		emm.init();
		function _checkPicSrc(src){
			return true;
		}
		function _checkYouku(){
			var tid = $("#typeid_main").val();
			if(tid!=4&&tid!=36){
				return false;
			}
			return true;
		}
		function _checkQQ(){
			var tid = $("#typeid_main").val();
			var tid_s = $("#typeid").val();
			if(tid!=13&&tid!=36&&tid!=11&&tid_s!=80&&tid_s!=81){
				return false;
			}
			return true;
		}
		function _typeChange(){
			if($(this).hasClass("on")) return;
			for(var i=0;i<emm.msgArray.length;i++){
				if(emm.msgArray[i].needRemove){
					emm.msgArray[i].bindobj.removeClass("error");
					emm.msgArray[i].close();
				} else{
					emm.msgArray[i].resetPos();
				}
			}
		}
		$("#select_arctype button").off("click",_typeChange);
		$("#select_arctype button").on("click",_typeChange);
		if(!$("#select_type_fix").hasClass("on")){
			$("#orig_av").val("");
		}
		if($("#imghead").val()!=""&&!_checkPicSrc($("#imghead").val())){
			emm.showErrMsg($("#imghead"),"图片地址非法");
		} 
		if($("#title").val()==""){
			emm.showErrMsg($("#title"),"标题不能为空");
		} 
		if($("#title").val().length>40){
			emm.showErrMsg($("#title"),"标题字数请控制在40字以内");
		}
		if($("#tags").val()==""){
			emm.showErrMsg($("#tags"),"tag不能为空");
		}
		if($("#typeid").val()==0){
			emm.showErrMsg($("#typeid"),"请选择隶属栏目");
		} 
		if($("#comefrom").val()==""&&!$("#select_type_src").hasClass("on")){
			emm.showErrMsg($("#comefrom"),"请填写视频出处",0,function(){
				emm.removeErr(emm.error);
			});
		} 
		if($("#select_type_fix").hasClass("on")&&$("#orig_av").val()==""){
			emm.showErrMsg($("#orig_av"),"补档请填写补档AV号",0,function(){
				emm.removeErr(emm.error);
			});
		}
		if($("#description").val()==""){
			emm.showErrMsg($("#description"),"请填写简介");
		}
		if($("#description").val().length>200){
			emm.showErrMsg($("#description"),"简介字数不要超过200");
		}
		if(!pv.codeMode&&pv.submitMode=="single"){
			pv.checkVideoItemInfo($("#content_url_1p_page"),"add",emm);
		}
		if(!pv.codeMode&&pv.submitMode=="multi"&&$("#multiP_sortable li.item").length==0){
			emm.showErrMsg($(".add-video"),"请添加视频源信息");
		}
		if(!pv.codeMode&&pv.submitMode=="multi"&&$("#multiP_sortable li.item.lock").length!=$("#multiP_sortable li.item").length){
			emm.showErrMsg($("#multiP_sortable li").not(".lock"),"你还有未保存的更改",2000);
		}
		if(!pv.codeMode&&$("#lanmu").length>0&&$("#typeid").val()!=0&&$('.slt_src_type option[value="youku"]:selected').length>0&&!_checkYouku()){
			emm.showErrMsg($("#typeid"),"优酷源只允许投游戏区和科技区");
		}
		/*if(!pv.codeMode&&$("#lanmu").length>0&&$("#typeid").val()!=0&&$('.slt_src_type option[value="qq"]:selected').length>0&&!_checkQQ()){
			emm.showErrMsg($("#typeid"),"腾讯源只允许投新番区，科技区，影视区和娱乐区的美食分区");
		}*/
		if(!pv.codeMode&&!pv.queryCheck()){
			emm.showErrMsg($("#multiP_sortable li.uploading"),"有视频正在上传",1500);
		}
		if(!pv.codeMode&&pv.queryCheck()&&$("#multiP_sortable li.uploading").length>0){
			emm.showErrMsg($("#multiP_sortable li.uploading"),"有未成功上传的视频",2000);
		}
		if(pv.codeMode&&!$("#body").val()){
			emm.showErrMsg($("#body"),"请填写投稿代码");
		}
		if(emm.error!=0){
			emm.msgArray[0].scrollToMsg(emm.firstErr);
			return false;
		} else{
			if ($("#mission_id").length&&parseInt($("#mission_id").val()) > 0){
				var ms = "";
				var obj = $("#mission_id").get(0);
				for (var i=0;i<obj.options.length;i++)
				{
					if (obj.options[i].selected){
						ms = obj.options[i].text;
						break;
					}
				}
				return confirm("您的投稿将要参加活动："+ms+"，请确认！");
			} else{
				return true;
			}
		}
	},
	bindTypeChange:function(object){
		var pv = this;
		$(".slt_src_type",object).off("change");
		$(".slt_src_type",object).change(function(){
			var sel = $(this);
			if(sel.val()==pv.TYPES.VUPLOAD.value){
				$(".url",object).replaceWith('<div class="upload_wrapper"><input type="hidden" class="url"><span id="upload_btn_placeholder"></span><span class="fn">未选择文件</span></div>');
				$('<div class="status"></div>').appendTo(object);
				$('<div class="progress"></div>').appendTo(object).hide();
				$(".progress", object).progressbar({
					value: 0
				});
				var swfu;
				var settings = getSWFSettings(object,pv);
				swfu = new SWFUpload(settings);
			} else{
				object.removeClass("uploading error");
				$(".upload_wrapper",object).replaceWith('<input class="control-inpt-input url" type="text" style="width: 155px; margin-left:7px;"/>');
				if(sel.val()==object.attr("temp_type")){
					$(".url",object).val(object.attr("temp_url"));
				} else{
					$(".url",object).val("");
				}
				$(".edit,.del",object).show();
				$(".status",object).remove();
				$(".progress",object).remove();
				$(".cancel_upload",object).remove();
			}
		});
	},
	buildBodyFromList:function(mode,submit){
		var pv = this;
		var body_msg = "";
		var items;
		if(mode=="multi"||typeof(mode)=="undefined"){
			items = $("#multiP_sortable li.item");
		} else{
			items = $("#content_url_1p_page");
		}
		if(submit){
			var from = "";
			if($("#comefrom").length>0&&$("#description").val().indexOf($("#comefrom").val())!=0){
				from = $("#comefrom").val()+" "; 
			}
			$("#description").val(from+$("#description").val());
		}
		for (var i = 0; i < items.length; i++){
			var vType = $(".slt_src_type",items[i]).val();
			var names = $(".pagename", items[i]).val() ? $(".pagename", items[i]).val() : "P"+i;
			var desc = $(".desc", items[i]).val() ? "[desc]"+$(".desc", items[i]).val()+"[/desc]" : "";
			body_msg+="["+vType+"]"+$(".url",items[i]).val()+"[/"+vType+"]"+desc.replace(/(\n|\r\n)/g," ")+(items.length > 1 ? "#p#"+names+"#e#" : "")+"\n";
		}
		$("#body").val(body_msg);
	},
	buildList:function(){
		var pv = this;
		pv.list = [];
		var items = $("#multiP_sortable li.item");
		for (var i = 0; i < items.length; i++){
			var vType = $(".slt_src_type",items[i]).val();
			var names = $(".pagename", items[i]).val() ? $(".pagename", items[i]).val() : "P"+i;
			var desc = $(".desc", items[i]).val();
			var link = $(".url",items[i]).val();
			pv.list.push({
				desc:desc,
				link:link,
				page:i,
				part:names,
				type:vType,
				saved:$(items[i]).hasClass("lock")
			});
		}
	},
	addP:function(video_link,video_type, description,pagename,saved) {
		var pv = this;	
		var object = null;
		function _setLock(btn,item){
			btn.text("编辑");
			item.addClass("lock");
			item.find("input,textarea,select").attr("disabled",true);
		}
		function _setEdit(btn,item){
			btn.text("保存");
			item.removeClass("lock");
			item.find("input,textarea,select").attr("disabled",false);
		}
		if(typeof(video_link)=="object"){
			object = video_link;
			var video_type = pv.TYPES.VUPLOAD.value;
			object.attr("class","item clearfix clickable uploading");
			$("#add_video",object).replaceWith('<a class="edit" style="margin-left:7px;">保存</a><a class="del" style="margin-left:7px;">删除</a>');
			$(".cancel_upload",object).removeClass("btn simple");
			$(".edit,.del",object).hide();
			pv.initAddControl();
		} else{
			object = $('<li class="item clearfix clickable">' + 
							'<div class="control-btn-select" style="width: 65px;"><span></span><select class="slt_src_type"><option value="0" disabled="disabled">选择</option></select></div>'+
							'<input class="control-inpt-input url" style="width: 155px; margin-left:7px;" value="'+video_link+'"/>' + 
							'<input class="control-inpt-input pagename" style="width: 95px; margin-left:7px;" value="'+pagename+'"/>' + 
							'<textarea class="control-inpt-input desc auto-size" style="width: 240px; margin-left:7px;">'+(typeof(description)!="undefined"?description:"")+'</textarea>' + 
							'<a class="edit" style="margin-left:7px;">编辑</a><a class="del" style="margin-left:7px;">删除</a>' + 
						'</li>').insertBefore('#multiP_sortable .add-video');
			pv.initSelectObj(object);
			var type_option = $('.slt_src_type option[value="'+video_type+'"]',object);
			if(type_option.length>0&&video_type!=pv.TYPES.VUPLOAD.value){
				type_option.attr("selected",true);
				$(".slt_src_type",object).change();
			} else{
				var typeName = video_type;
				if(video_type==pv.TYPES.VUPLOAD.value){
					typeName = pv.TYPES.VUPLOAD.name;
				}
				$(".control-btn-select",object).replaceWith('<div class="slt_type_local"><input type="hidden" class="slt_src_type" value="'+video_type+'" />'+typeName+'</div>');
				if(video_type==pv.TYPES.VUPLOAD.value){
					$(".url",object).replaceWith('<div class="url_local"><input type="hidden" class="url" value="'+video_link+'" />'+video_link+'</div>');
				}
			}
		}
		pv.strCount.bind($(".desc",object),200);
		pv.bindTypeChange(object);

		var editBtn = $(".edit", object);

		if(typeof saved !="undefined"){
			if(!saved || video_type == pv.TYPES.VUPLOAD.value && !video_link){
				if(video_type != pv.TYPES.VUPLOAD.value || pv.TYPES.VUPLOAD.value && !video_link){
					$('[value="'+video_type+'"]',object).attr("selected",true);
					$(".slt_src_type",object).change();
				}
				_setEdit(editBtn,object);
			} else{
				_setLock(editBtn,object);
			}
		} else{
			_setLock(editBtn,object);
		}

		editBtn.click(function(){
			var self = $(this);
			var item = self.parent();
			if(item.hasClass("lock")){
				item.attr("temp_type",$(".slt_src_type",object).val());
				item.attr("temp_url",$(".url",object).val());
				_setEdit(self,item);
			} else{
				var checked = pv.checkVideoItemInfo(item,"edit");
				if(checked){
					if($(".pagename",item).val()=="") $(".pagename",item).val(checked.pagename);
					item.attr("temp_type",checked.src_type);
					item.attr("temp_url",checked.url);
					_setLock(self,item);
				} else{

				}
			}
		});	
		$(".del", object).click(function(){
			object.remove();
			pv.buildList();
		});
		$(".control-btn-select",object).find("span").html($("option:selected",object).html());
		return object;
	},
	initVideoList:function(v_list){
		var pv = this;
		for(var i=0;i<v_list.length;i++){
			pv.addP(v_list[i].link,v_list[i].type,v_list[i].desc,v_list[i].part,v_list[i].saved);
		}
		//console.log(v_list);
	},
	infoRecover:function(){
		var pv = this;
		var timer = setInterval(function(){
			clearInterval(timer);
			if(window.localStorage){
				if (window.localStorage.getItem("submit_info") && window.localStorage.getItem("submit_info") != "null" && window.localStorage.getItem("submit_info")!==undefined){
					var info = JSON.parse(window.localStorage.getItem("submit_info"));
					for(var i in info){
						if(info[i]){
							break;
						}
						return;
					}
					if(confirm("有保存未投稿的数据，是否载入？")){
						pv.manuallyPost();
						$("#title").val(info.title);
						$("#description").val(info.description);
						$("#tags").val(info.tags);
						if (info.list){
							pv.initVideoList(info.list);
						}
					}
				}
			}
		}, 100);
		window.rememberTimer = setInterval(function(){
			if(location.hash.indexOf("video_submit")<0){
				clearInterval(rememberTimer);
				return;
			}
			if(window.localStorage){
				pv.buildList();
				var submitInfo = {
					title:$("#title").val(),
					tags:$("#tags").val(),
					description:$("#description").val(),
					list:pv.list
				};
				//console.log(submitInfo);
				window.localStorage.setItem("submit_info", JSON.stringify(submitInfo));
			}
		}, 1000);
	}
};

function ajaxFrmSubmit(frm){
	if(frm.hasClass("loading")) return;
	var url = frm.attr("action");
	if(url.indexOf("?")>=0) url += "&output=json";
	else url += "?output=json";
	frm.removeAttr("hasMessageBox");
	var loading = new MessageBox();
	loading.showEx(frm,"提交中",0,"loading");
	$.ajax({
		url:url,
		type:"POST",
		dataType:"json",
		data:frm.serialize(),
		success:function(data)
		{
			loading.close();
			frm.removeClass("loading");
			if(data==null){
				new FloatMessageBox().show("未知的错误","msg_err");
				return;
			}
			if(data.code==-1){
				new FloatMessageBox().show(data.msg,"msg_err");
			} else if(data.code==0){
				new FloatMessageBox().show(data.msg);
			} else{
				new FloatMessageBox().show(data);
			}
		},
		error:function(){
			loading.close();
			frm.removeClass("loading");
			new FloatMessageBox().show("网络错误,请稍后重试","msg_err");
		}
	});
}

function getSWFSettings(append_row,pv)
{
	var c_btn = $(".upload_wrapper",append_row);
	var btn = $('<a class="cancel_upload" style="margin-left:7px;">上传</a>');
	var progress_bar = $(".progress", append_row);
	var status = $(".status", append_row);
	var filename = "";
	var server_ip;
	var url_data = null;
	
	var last_date = new Date();
	var last_bytes = 0;
	var u_sp = "";
	var request;

	function turnBack(obj){
		obj.setButtonDimensions(66, 20);
		$(".del",append_row).show();
		$(".cancel_upload",append_row).html("上传");
		//progress_bar.hide();
		$("input,textarea,select",append_row).attr("disabled",false);
		append_row.removeClass("lock");
	}

	var settings = {
		flash_url : "http://static.hdslb.com/images/swfupload/swfupload.swf",
		upload_url: "http://pl.bilibili.tv/",
		file_post_name: "file",
		file_size_limit : "2000 MB",
		file_types : (typeof(pv.allowLocal) == "object" ? pv.allowLocal.file_types : [
			"*.flv"
		]),
		file_types_description : (typeof(pv.allowLocal) == "object" ? pv.allowLocal.file_types_description : [
			"Video Files"
		]),
		file_upload_limit : 2000,
		file_queue_limit : 0,
		custom_settings : {
			progressTarget : "fsUploadProgress",
			cancelButtonId : "btnCancel"
		},
		debug: false,

		// Button settings
		button_action : SWFUpload.BUTTON_ACTION.SELECT_FILE,
		button_image_url: "http://static.hdslb.com/images/btn/upload_zh_cn_66x20.png",
		button_width: "66",
		button_height: "20",
		button_placeholder_id: "upload_btn_placeholder",
		
		// The event handler functions are defined in handlers.js
		file_queued_handler : function(file){
			//this.setButtonDisabled(true);
			$(".fn",append_row).html(file.name).attr("selected",1);
			var self = this;
			pv.upload_query[self.movieName] = {
				requesting:0,
				uploading:0
			}
			$(".edit,#add_video",append_row).hide();
			if(btn.length>0) {
				btn.off("click");
			};
			btn.insertAfter($(".desc",append_row));
			if(append_row.hasClass("add-video")) btn.addClass("btn simple");
			btn.click(function(){
				if(pv.upload_query[self.movieName].uploading||pv.upload_query[self.movieName].requesting){
					if(pv.upload_query[self.movieName].requesting && request){
						request.abort();
					}
					self.stopUpload();
					turnBack(self);
					status.html("").hide();
					progress_bar.hide();
				} else{
					var mode = "edit";
					if(append_row.hasClass("add-video")){
						mode = "add";
					}
					var checked = pv.checkVideoItemInfo(append_row,mode);
					if (!checked) return;
					$(".pagename",append_row).val(checked.pagename);
					self.setButtonDimensions(0, 0);
					$(".del",append_row).hide();
					btn.html("取消");
					status.show();
					progress_bar.show();
					$("input,textarea,select",append_row).attr("disabled",true);
					append_row.addClass("lock");
					try {
						var swfupl = self;
						
						append_row.addClass("uploading");
						if(append_row.hasClass("add-video")){
							pv.addP(append_row);
						}
						var on_url_got = function(data)
							{
								pv.upload_query[self.movieName].requesting = 0;
								pv.queryCheck();
								url_data = data;

								if (data.error_code == 21332)
								{
									status.html('<a href="/weibo_bind?mode=slient" target="_blank"><img src="http://static.hdslb.com/images/common/weibo_login.png" /></a>');
									swfupl.cancelUpload(file.id);
								}else if (data.error_code == 21000)
								{
									status.html("请求上传地址失败");
									(new MessageBox()).show(c_btn,"请刷新页面重新登录",2000,"warning");
									swfupl.cancelUpload(file.id);
								}else if(data.error_code == 20000)
								{
									status.html("请求上传地址失败");
									(new MessageBox()).show(c_btn,"请先登录",2000,"warning");
									swfupl.cancelUpload(file.id);
								}else if(data.error_code)
								{
									url_data = null;
									status.html("请求上传地址失败，如果连续失败，请隔一段时间后再尝试");
									(new MessageBox()).show(c_btn,data.error_text,2000,"warning");
									swfupl.cancelUpload(file.id);
									turnBack(self);
								}else
								{
									filename = data.file_name;
									server_ip = data.server_ip;
									swfupl.setUploadURL(data.url);
									swfupl.startUpload(file.id);
								}
							};
						if (url_data==null)
						{
							status.html("正在请求上传地址...");
							pv.upload_query[self.movieName].requesting = 1;
							window.onbeforeunload = function(){  
							    return "有文件正在上传";     
							};
							request = $.getJSON("/get_upload_url", on_url_got).error(function(){
								pv.upload_query[self.movieName].requesting = 0;
								pv.queryCheck();
								turnBack(self);
								status.html("服务器错误，请重试");
							});
						}else
						{
							if(url_data.error_code){
								pv.upload_query[self.movieName].requesting = 1;
								status.html("正在请求上传地址...");	
							} else{
								pv.upload_query[self.movieName].uploading = 1;
								status.html("正在上传...");		
							}
							on_url_got(url_data);
						}
					} catch (ex)  {
						//this.debug(ex);
					}
				}
			});
		},
		file_queue_error_handler : function(file, errorCode, message) {
			try {
				switch (errorCode) {
				case SWFUpload.QUEUE_ERROR.FILE_EXCEEDS_SIZE_LIMIT:
					status.html("未选择文件");
					(new MessageBox()).show(c_btn,"文件大小过大，请重新选择",2000,"warning");
					break;
				case SWFUpload.QUEUE_ERROR.ZERO_BYTE_FILE:
					status.html("未选择文件");
					(new MessageBox()).show(c_btn,"不允许上传空文件，请重新选择",2000,"warning");
					break;
				case SWFUpload.QUEUE_ERROR.INVALID_FILETYPE:
					status.html("未选择文件");
					(new MessageBox()).show(c_btn,"文件类型错误，请重新选择",2000,"warning");
					break;
				default:
					(new MessageBox()).show(c_btn,"未知错误："+errorCode+" "+message,2000,"warning");
					break;
				}
			} catch (ex) {
				this.debug(ex);
			}
		},
		file_dialog_complete_handler: function(numFilesSelected, numFilesQueued) {
			if(numFilesSelected>=1){
				append_row.addClass("uploading");
				new MessageBox().showEx(append_row,"选择文件后以及上传中的列表项会暂时禁用拖动功能",1500,"tips");
			}
		},
		upload_start_handler : function(file){
			var self = this;
			status.html("正在上传...");
			pv.upload_query[self.movieName].uploading = 1;
			window.onbeforeunload = function(){  
			    return "有文件正在上传";     
			};
		},
		upload_progress_handler : function(file, bytesLoaded, bytesTotal) {
			try {
				var percent = Math.ceil((bytesLoaded / bytesTotal) * 100);

				if (new Date().getTime() - last_date.getTime() > 1000)
				{
					u_sp = (bytesLoaded - last_bytes)/((new Date().getTime() - last_date.getTime())/1000);
					if (u_sp > 1048576)
					{
						u_sp = Math.floor(u_sp / 1048576)+"MB/s";
					}else if (u_sp > 1024)
					{
						u_sp = Math.floor(u_sp / 1024)+"KB/s";
					}else
					{
						u_sp = Math.floor(u_sp)+"B/s";
					}
					last_bytes = bytesLoaded;
					last_date = new Date();
				}
				progress_bar.progressbar({
					value: percent
				});
				status.html("正在上传...("+percent+"%"+(u_sp ? " "+u_sp : "")+")");
			} catch (ex) {
				this.debug(ex);
			}
		},
		upload_success_handler : function(file) {
			var self = this;
			$.get("/video?act=upload_success&fn="+encodeURIComponent(filename), function(data){
				pv.upload_query[self.movieName].uploading = 0;
				pv.queryCheck();
				append_row.removeClass("uploading");
				status.html("<a href='http://yuntv.letv.com/bcloud.html?uu=bilibiliFK&vu="+filename.split("|")[0]+"' target='_blank'>视频上传完成。预览以便查看转码状态，请在转码成功后确认投稿，以免因无法播放或上传错误被打回</a>");
				$(".url",append_row).val(filename.split("|")[0]);
				$(".url",append_row).attr("fn",filename.split("|")[0]);
				$(".control-btn-select",append_row).replaceWith('<div class="slt_type_local"><input type="hidden" class="slt_src_type" value="'+pv.TYPES.VUPLOAD.value+'" />'+pv.TYPES.VUPLOAD.name+'</div>');
				$(".cancel_upload",append_row).hide();
				$(".edit",append_row).html("编辑");
				$(".edit,.del",append_row).show();
			});
		},
		upload_error_handler : function(file, errorCode, message) {
			var self = this;
			pv.upload_query[self.movieName].uploading = 0;
			pv.queryCheck();
			try {
				$.get("/video?act=upload_fail&fn="+encodeURIComponent(filename)+"&code="+errorCode, function(data){
				});
				switch (errorCode) {
					case SWFUpload.UPLOAD_ERROR.HTTP_ERROR:
						(new MessageBox()).show(c_btn,"上传错误: "+message,2000,"warning");
						status.html("上传错误");
						turnBack(self);
						break;
					case SWFUpload.UPLOAD_ERROR.UPLOAD_FAILED:
						status.html("上传失败");
						turnBack(self);
						(new MessageBox()).show(c_btn,"上传失败",2000,"warning");
						break;
					case SWFUpload.UPLOAD_ERROR.IO_ERROR:
						turnBack(self);
						status.html("服务器IO错误");
						(new MessageBox()).show(c_btn,"服务器IO错误",2000,"warning");
						break;
					case SWFUpload.UPLOAD_ERROR.SECURITY_ERROR:
						turnBack(self);
						status.html("安全沙箱错误");
						(new MessageBox()).show(c_btn,"安全沙箱错误",2000,"warning");
						break;
					case SWFUpload.UPLOAD_ERROR.UPLOAD_LIMIT_EXCEEDED:
						turnBack(self);
						status.html("上传限制错误");
						(new MessageBox()).show(c_btn,"上传限制错误",2000,"warning");
						break;
					case SWFUpload.UPLOAD_ERROR.FILE_VALIDATION_FAILED:
						turnBack(self);
						status.html("校验错误");
						(new MessageBox()).show(c_btn,"校验错误",2000,"warning");
						break;
					case SWFUpload.UPLOAD_ERROR.FILE_CANCELLED:
						turnBack(self);
						break;
					case SWFUpload.UPLOAD_ERROR.UPLOAD_STOPPED:
						break;
					default:
						turnBack(self);
						if(errorCode==-260){
							status.html("请重新选择文件");
							(new MessageBox()).show(c_btn,"请重新选择文件",2000,"warning");
						} else{	
							status.html("未知错误  "+errorCode+" "+message);
							(new MessageBox()).show(c_btn,"未知错误  "+errorCode+" "+message,2000,"warning");
						}
						break;
				}
			} catch (ex) {
				this.debug(ex);
			}
		}
	};
	return settings;
}
