'use strict'

const path = require('path')

// dev / prod 환경 변수 직접 로드
const devEnv = require('./dev.env')
const prodEnv = require('./prod.env')

// 현재 환경 판단
const isProd = process.env.NODE_ENV === 'production'
const envConfig = isProd ? prodEnv : devEnv

// TARGET 문자열에서 양쪽 큰따옴표 제거
const targetUrl = envConfig.TARGET.replace(/"/g, '')

const commonProxy = {
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Referer', targetUrl)
  },
  target: targetUrl,
  changeOrigin: true
}

module.exports = {
  build: {
    env: require('./prod.env'),
    ojIndex: path.resolve(__dirname, '../dist/index.html'),
    ojTemplate: path.resolve(__dirname, '../src/pages/oj/index.html'),
    adminIndex: path.resolve(__dirname, '../dist/admin/index.html'),
    adminTemplate: path.resolve(__dirname, '../src/pages/admin/index.html'),
    assetsRoot: path.resolve(__dirname, '../dist'),
    assetsSubDirectory: 'static',
    assetsPublicPath: '/__STATIC_CDN_HOST__/',
    productionSourceMap: process.env.USE_SENTRY === '1',
    productionGzip: false,
    productionGzipExtensions: ['js', 'css'],
    bundleAnalyzerReport: process.env.npm_config_report
  },
  dev: {
    env: require('./dev.env'),
    port: process.env.PORT || 8080,
    autoOpenBrowser: true,
    assetsSubDirectory: 'static',
    assetsPublicPath: '/',
    proxyTable: {
      "/api": commonProxy,
      "/public": commonProxy
    },
    cssSourceMap: false
  }
}

