//
// Generate HTML report from K6 summary data
// Ben Coleman, March 2021
//

// Have to import ejs this way, nothing else works
import ejs from '../node_modules/ejs/ejs.min.js'
import template from './template.ejs'

const version = '2.3.0'

//
// Main function should be imported and wrapped with the function handleSummary
//
export function htmlReport(data, opts = {}) {
  // Default options
  if (!opts.title) {
    opts.title = new Date().toISOString().slice(0, 16).replace('T', ' ')
  }
  // eslint-disable-next-line
  if (!opts.hasOwnProperty('debug')) {
    opts.debug = false
  }

  console.log(`[k6-reporter v${version}] Generating HTML summary report`)
  let metricListSorted = []

  if (opts.debug) {
    console.log(JSON.stringify(data, null, 2))
  }

  // Count the thresholds and those that have failed
  let thresholdFailures = 0
  let thresholdCount = 0
  for (let metricName in data.metrics) {
    metricListSorted.push(metricName)
    if (data.metrics[metricName].thresholds) {
      thresholdCount++
      let thresholds = data.metrics[metricName].thresholds
      for (let thresName in thresholds) {
        if (!thresholds[thresName].ok) {
          thresholdFailures++
        }
      }
    }
  }

  // Count the checks and those that have passed or failed
  // NOTE. Nested groups are not checked!
  let checkFailures = 0
  let checkPasses = 0
  if (data.root_group.checks) {
    let { passes, fails } = countChecks(data.root_group.checks)
    checkFailures += fails
    checkPasses += passes
  }

  for (let group of data.root_group.groups) {
    if (group.checks) {
      let { passes, fails } = countChecks(group.checks)
      checkFailures += fails
      checkPasses += passes
    }
  }

  const standardMetrics = [
    'grpc_req_duration',
    'http_req_duration',
    'http_req_waiting',
    'http_req_connecting',
    'http_req_tls_handshaking',
    'http_req_sending',
    'http_req_receiving',
    'http_req_blocked',
    'iteration_duration',
    'group_duration',
    'ws_connecting',
    'ws_msgs_received',
    'ws_msgs_sent',
    'ws_sessions',
  ]

  const otherMetrics = [
    'iterations',
    'data_sent',
    'checks',
    'http_reqs',
    'data_received',
    'vus_max',
    'vus',
    'http_req_failed',
    'http_req_duration{expected_response:true}',
  ]

  const metricNameMapping = {
    'grpc_req_duration': 'gRPC 请求持续时间',
    'http_req_duration': 'HTTP 请求持续时间',
    'http_req_waiting': 'HTTP 请求等待时间',
    'http_req_connecting': 'HTTP 请求连接时间',
    'http_req_tls_handshaking': 'HTTP 请求 TLS 握手时间',
    'http_req_sending': 'HTTP 请求发送时间',
    'http_req_receiving': 'HTTP 请求接收时间',
    'http_req_blocked': 'HTTP 请求阻塞时间',
    'iteration_duration': '迭代持续时间',
    'group_duration': '组持续时间',
    'ws_connecting': 'WebSocket 连接时间',
    'ws_msgs_received': 'WebSocket 消息接收',
    'ws_msgs_sent': 'WebSocket 消息发送',
    'ws_sessions': 'WebSocket 会话',
    'iterations': '迭代次数',
    'data_sent': '数据发送',
    'checks': '检查',
    'http_reqs': 'HTTP 请求',
    'data_received': '数据接收',
    'vus_max': '最大虚拟用户数',
    'vus': '虚拟用户数',
    'http_req_failed': 'HTTP 请求失败',
    'http_req_duration{expected_response:true}': 'HTTP 请求持续时间（预期响应：true）',
  };

  function getMetricDisplayName(metric) {
    return metricNameMapping[metric] || metric;
  }

  // Render the template
  const html = ejs.render(template, {
    data,
    title: opts.title,
    standardMetrics,
    otherMetrics,
    thresholdFailures,
    thresholdCount,
    checkFailures,
    checkPasses,
    version,
    getMetricDisplayName,
  })

  // Return HTML string needs wrapping in a handleSummary result object
  // See https://k6.io/docs/results-visualization/end-of-test-summary#handlesummary-callback
  return html
}

//
// Helper for counting the checks in a group
//
function countChecks(checks) {
  let passes = 0
  let fails = 0
  for (let check of checks) {
    passes += parseInt(check.passes)
    fails += parseInt(check.fails)
  }
  return { passes, fails }
}
