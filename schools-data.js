/* ================================================================
   院校数据库：热门院校官方研招网/研究生院网址（用于快速查询考试信息）
   说明：网址可能随学校改版变动，每个院校都附带了「搜索」兜底入口。
   数据挂载到 window.SCHOOLS_DATA。
================================================================ */
window.SCHOOLS_DATA = {
  regions: ['华北', '华东', '华中', '华南', '西南', '西北', '东北'],
  schools: [
    /* ---- 华北 ---- */
    { name: '清华大学', city: '北京', region: '华北', tags: ['985', '211', '双一流'], url: 'https://yz.tsinghua.edu.cn' },
    { name: '北京大学', city: '北京', region: '华北', tags: ['985', '211', '双一流'], url: 'https://grs.pku.edu.cn' },
    { name: '中国人民大学', city: '北京', region: '华北', tags: ['985', '211', '双一流'], url: 'https://pgs.ruc.edu.cn' },
    { name: '北京航空航天大学', city: '北京', region: '华北', tags: ['985', '211', '双一流'], url: 'https://yzb.buaa.edu.cn' },
    { name: '北京理工大学', city: '北京', region: '华北', tags: ['985', '211', '双一流'], url: 'https://grd.bit.edu.cn' },
    { name: '北京师范大学', city: '北京', region: '华北', tags: ['985', '211', '双一流'], url: 'https://yz.bnu.edu.cn' },
    { name: '中国农业大学', city: '北京', region: '华北', tags: ['985', '211', '双一流'], url: 'https://yz.cau.edu.cn' },
    { name: '中央财经大学', city: '北京', region: '华北', tags: ['211', '双一流'], url: 'https://gs.cufe.edu.cn' },
    { name: '对外经济贸易大学', city: '北京', region: '华北', tags: ['211', '双一流'], url: 'https://yjsy.uibe.edu.cn' },
    { name: '中国政法大学', city: '北京', region: '华北', tags: ['211', '双一流'], url: 'https://yjsy.cupl.edu.cn' },
    { name: '北京邮电大学', city: '北京', region: '华北', tags: ['211', '双一流'], url: 'https://yzb.bupt.edu.cn' },
    { name: '北京交通大学', city: '北京', region: '华北', tags: ['211', '双一流'], url: 'https://yzb.bjtu.edu.cn' },
    { name: '南开大学', city: '天津', region: '华北', tags: ['985', '211', '双一流'], url: 'https://yzb.nankai.edu.cn' },
    { name: '天津大学', city: '天津', region: '华北', tags: ['985', '211', '双一流'], url: 'https://yzb.tju.edu.cn' },
    { name: '中国科学院大学', city: '北京', region: '华北', tags: ['双一流'], url: 'https://admission.ucas.ac.cn' },

    /* ---- 华东 ---- */
    { name: '复旦大学', city: '上海', region: '华东', tags: ['985', '211', '双一流'], url: 'https://gsao.fudan.edu.cn' },
    { name: '上海交通大学', city: '上海', region: '华东', tags: ['985', '211', '双一流'], url: 'https://yzb.sjtu.edu.cn' },
    { name: '同济大学', city: '上海', region: '华东', tags: ['985', '211', '双一流'], url: 'https://yz.tongji.edu.cn' },
    { name: '华东师范大学', city: '上海', region: '华东', tags: ['985', '211', '双一流'], url: 'https://yjszs.ecnu.edu.cn' },
    { name: '上海财经大学', city: '上海', region: '华东', tags: ['211', '双一流'], url: 'https://gs.sufe.edu.cn' },
    { name: '华东理工大学', city: '上海', region: '华东', tags: ['211', '双一流'], url: 'https://gs.ecust.edu.cn' },
    { name: '上海大学', city: '上海', region: '华东', tags: ['211', '双一流'], url: 'https://yjszs.shu.edu.cn' },
    { name: '南京大学', city: '南京', region: '华东', tags: ['985', '211', '双一流'], url: 'https://grawww.nju.edu.cn' },
    { name: '东南大学', city: '南京', region: '华东', tags: ['985', '211', '双一流'], url: 'https://yzb.seu.edu.cn' },
    { name: '南京航空航天大学', city: '南京', region: '华东', tags: ['211', '双一流'], url: 'https://www.graduate.nuaa.edu.cn' },
    { name: '南京理工大学', city: '南京', region: '华东', tags: ['211', '双一流'], url: 'https://gs.njust.edu.cn' },
    { name: '苏州大学', city: '苏州', region: '华东', tags: ['211', '双一流'], url: 'https://yjs.suda.edu.cn' },
    { name: '浙江大学', city: '杭州', region: '华东', tags: ['985', '211', '双一流'], url: 'https://grs.zju.edu.cn' },
    { name: '中国科学技术大学', city: '合肥', region: '华东', tags: ['985', '211', '双一流'], url: 'https://yz.ustc.edu.cn' },
    { name: '合肥工业大学', city: '合肥', region: '华东', tags: ['211', '双一流'], url: 'https://yjszs.hfut.edu.cn' },
    { name: '厦门大学', city: '厦门', region: '华东', tags: ['985', '211', '双一流'], url: 'https://yz.xmu.edu.cn' },
    { name: '山东大学', city: '济南', region: '华东', tags: ['985', '211', '双一流'], url: 'https://yz.sdu.edu.cn' },
    { name: '中国海洋大学', city: '青岛', region: '华东', tags: ['985', '211', '双一流'], url: 'https://yz.ouc.edu.cn' },

    /* ---- 华中 ---- */
    { name: '武汉大学', city: '武汉', region: '华中', tags: ['985', '211', '双一流'], url: 'https://gs.whu.edu.cn' },
    { name: '华中科技大学', city: '武汉', region: '华中', tags: ['985', '211', '双一流'], url: 'https://gs.hust.edu.cn' },
    { name: '中南大学', city: '长沙', region: '华中', tags: ['985', '211', '双一流'], url: 'https://gra.csu.edu.cn' },
    { name: '湖南大学', city: '长沙', region: '华中', tags: ['985', '211', '双一流'], url: 'https://grd.hnu.edu.cn' },
    { name: '郑州大学', city: '郑州', region: '华中', tags: ['211', '双一流'], url: 'https://gs.zzu.edu.cn' },

    /* ---- 华南 ---- */
    { name: '中山大学', city: '广州', region: '华南', tags: ['985', '211', '双一流'], url: 'https://graduate.sysu.edu.cn' },
    { name: '华南理工大学', city: '广州', region: '华南', tags: ['985', '211', '双一流'], url: 'https://yz.scut.edu.cn' },
    { name: '暨南大学', city: '广州', region: '华南', tags: ['211', '双一流'], url: 'https://yz.jnu.edu.cn' },
    { name: '深圳大学', city: '深圳', region: '华南', tags: [], url: 'https://yz.szu.edu.cn' },
    { name: '南方科技大学', city: '深圳', region: '华南', tags: ['双一流'], url: 'https://gs.sustech.edu.cn' },

    /* ---- 西南 ---- */
    { name: '四川大学', city: '成都', region: '西南', tags: ['985', '211', '双一流'], url: 'https://yz.scu.edu.cn' },
    { name: '电子科技大学', city: '成都', region: '西南', tags: ['985', '211', '双一流'], url: 'https://yz.uestc.edu.cn' },
    { name: '重庆大学', city: '重庆', region: '西南', tags: ['985', '211', '双一流'], url: 'https://yz.cqu.edu.cn' },
    { name: '西南财经大学', city: '成都', region: '西南', tags: ['211', '双一流'], url: 'https://yz.swufe.edu.cn' },
    { name: '西南交通大学', city: '成都', region: '西南', tags: ['211', '双一流'], url: 'https://yz.swjtu.edu.cn' },
    { name: '云南大学', city: '昆明', region: '西南', tags: ['211', '双一流'], url: 'https://www.grs.ynu.edu.cn' },

    /* ---- 西北 ---- */
    { name: '西安交通大学', city: '西安', region: '西北', tags: ['985', '211', '双一流'], url: 'https://yz.xjtu.edu.cn' },
    { name: '西北工业大学', city: '西安', region: '西北', tags: ['985', '211', '双一流'], url: 'https://yzb.nwpu.edu.cn' },
    { name: '西安电子科技大学', city: '西安', region: '西北', tags: ['211', '双一流'], url: 'https://yz.xidian.edu.cn' },
    { name: '西北大学', city: '西安', region: '西北', tags: ['211', '双一流'], url: 'https://yjs.nwu.edu.cn' },
    { name: '兰州大学', city: '兰州', region: '西北', tags: ['985', '211', '双一流'], url: 'https://yz.lzu.edu.cn' },

    /* ---- 东北 ---- */
    { name: '哈尔滨工业大学', city: '哈尔滨', region: '东北', tags: ['985', '211', '双一流'], url: 'https://yzb.hit.edu.cn' },
    { name: '哈尔滨工程大学', city: '哈尔滨', region: '东北', tags: ['211', '双一流'], url: 'https://yzb.hrbeu.edu.cn' },
    { name: '吉林大学', city: '长春', region: '东北', tags: ['985', '211', '双一流'], url: 'https://yjsy.jlu.edu.cn' },
    { name: '大连理工大学', city: '大连', region: '东北', tags: ['985', '211', '双一流'], url: 'https://gs.dlut.edu.cn' },
    { name: '东北大学', city: '沈阳', region: '东北', tags: ['985', '211', '双一流'], url: 'https://yz.neu.edu.cn' }
  ],

  provinces: [
    { name: '北京教育考试院', url: 'https://www.bjeea.cn' },
    { name: '上海教育考试院', url: 'https://www.shmeea.edu.cn' },
    { name: '天津招考资讯网', url: 'https://www.zhaokao.net' },
    { name: '重庆教育考试院', url: 'https://www.cqksy.cn' },
    { name: '广东省教育考试院', url: 'https://eea.gd.gov.cn' },
    { name: '江苏省教育考试院', url: 'https://www.jseea.cn' },
    { name: '浙江省教育考试院', url: 'https://www.zjzs.net' },
    { name: '山东省教育招生考试院', url: 'https://www.sdzk.cn' },
    { name: '河南省教育考试院', url: 'https://www.haeea.cn' },
    { name: '湖北省教育考试院', url: 'https://www.hbea.edu.cn' },
    { name: '四川省教育考试院', url: 'https://www.sceea.cn' },
    { name: '陕西省教育考试院', url: 'https://www.sneea.cn' },
    { name: '辽宁省招生考试办公室', url: 'https://www.lnzsks.com' }
  ]
};
