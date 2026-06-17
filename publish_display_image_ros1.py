#!/usr/bin/env python3
"""
Publish an image file to /display_image (sensor_msgs/CompressedImage),
or control the image viewer mode via /image_viewer_topic (std_msgs/String).

Usage:
  # 画像を直接送信して表示
  python3 publish_display_image_ros1.py <image_path> [--interval SEC]

  # モーダルを閉じる
  python3 publish_display_image_ros1.py --close

  # 画像ビューアモード: 指定トピックをブラウザに購読させる
  python3 publish_display_image_ros1.py --subscribe /camera/image/compressed

  # 画像ビューアモード停止
  python3 publish_display_image_ros1.py --unsubscribe
"""

import argparse
import sys
import time
from pathlib import Path
from typing import Optional

import rospy
from sensor_msgs.msg import CompressedImage
from std_msgs.msg import String


# ---- 直接画像送信モード ----

class DisplayImagePublisher:
    def __init__(self, image_path: Optional[str], topic: str, interval: float):
        self._pub = rospy.Publisher(topic, CompressedImage, queue_size=10)
        self._msg = self._build_close_msg() if image_path is None else self._load(image_path)
        self._interval = interval
        self._timer = None

        if interval > 0:
            self._timer = rospy.Timer(rospy.Duration(interval), lambda _: self._publish())

    def _build_close_msg(self) -> CompressedImage:
        msg = CompressedImage()
        msg.format = ''
        msg.data = bytes()
        return msg

    def _load(self, image_path: str) -> CompressedImage:
        path = Path(image_path)
        if not path.exists():
            rospy.logerr(f'File not found: {image_path}')
            sys.exit(1)

        suffix = path.suffix.lower().lstrip('.')
        fmt_map = {'jpg': 'jpeg', 'jpeg': 'jpeg', 'png': 'png', 'webp': 'webp'}
        fmt = fmt_map.get(suffix)
        if fmt is None:
            rospy.logerr(f'Unsupported format: {suffix}  (supported: jpg, png, webp)')
            sys.exit(1)

        msg = CompressedImage()
        msg.format = fmt
        msg.data = path.read_bytes()
        rospy.loginfo(f'Loaded {path.name}  ({len(msg.data)} bytes, format={fmt})')
        return msg

    def _publish(self):
        self._msg.header.stamp = rospy.Time.now()
        self._pub.publish(self._msg)
        rospy.loginfo(f'Published to {self._pub.name}')

    def publish_once(self):
        self._publish()

    def get_num_connections(self) -> int:
        return self._pub.get_num_connections()


# ---- 画像ビューアモード制御 ----

class ImageViewerController:
    def __init__(self, viewer_topic: str, control_topic: str):
        self._pub = rospy.Publisher(control_topic, String, queue_size=10)
        self._msg = String(data=viewer_topic)

    def publish_once(self):
        self._pub.publish(self._msg)
        label = self._msg.data if self._msg.data else '(空 → 購読停止)'
        rospy.loginfo(f'Published viewer topic: {label}')

    def get_num_connections(self) -> int:
        return self._pub.get_num_connections()


def wait_and_publish(node, repeat: int = 5, interval: float = 0.3, timeout: float = 10.0):
    """サブスクライバーが接続するまで待ってから複数回パブリッシュ。"""
    rospy.loginfo('Waiting for subscriber...')
    deadline = time.monotonic() + timeout
    while node.get_num_connections() == 0:
        if time.monotonic() > deadline:
            rospy.logwarn(f'No subscriber after {timeout}s, publishing anyway')
            break
        if rospy.is_shutdown():
            return
        rospy.sleep(0.1)

    rospy.loginfo('Subscriber found, publishing...')
    for _ in range(repeat):
        if rospy.is_shutdown():
            break
        node.publish_once()
        rospy.sleep(interval)


def main():
    parser = argparse.ArgumentParser(description='Display image or control image viewer')
    parser.add_argument('image', nargs='?', default=None,
                        help='Path to image file (jpg / png / webp)')
    parser.add_argument('--topic', default='/display_image',
                        help='Direct image publish topic (default: /display_image)')
    parser.add_argument('--interval', type=float, default=0.0,
                        help='Repeat interval in seconds (direct mode only)')
    parser.add_argument('--close', action='store_true',
                        help='Send empty image to dismiss the modal (/display_image)')
    parser.add_argument('--subscribe', metavar='TOPIC',
                        help='Tell browser to subscribe to TOPIC for images')
    parser.add_argument('--unsubscribe', action='store_true',
                        help='Tell browser to stop image viewer subscription')
    parser.add_argument('--control-topic', default='/image_viewer_topic',
                        help='Viewer control topic (default: /image_viewer_topic)')
    args = parser.parse_args()

    # 排他チェック
    modes = [bool(args.image), args.close, args.subscribe is not None, args.unsubscribe]
    if sum(modes) > 1:
        parser.error('--close / --subscribe / --unsubscribe / image は同時に指定できません')
    if sum(modes) == 0:
        parser.error('image path, --close, --subscribe, または --unsubscribe が必要です')

    rospy.init_node('display_image_publisher', anonymous=True)

    # --- 画像ビューアモード ---
    if args.subscribe is not None or args.unsubscribe:
        viewer_topic = '' if args.unsubscribe else args.subscribe
        node = ImageViewerController(viewer_topic, args.control_topic)
        wait_and_publish(node)
        return

    # --- 直接画像送信モード ---
    image_path = None if args.close else args.image
    node = DisplayImagePublisher(image_path, args.topic, args.interval)

    if args.interval > 0:
        try:
            rospy.spin()
        except rospy.ROSInterruptException:
            pass
    else:
        wait_and_publish(node)


if __name__ == '__main__':
    main()
