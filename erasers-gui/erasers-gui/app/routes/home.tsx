import { useEffect, useState } from 'react';
import ROSLIB from 'roslib';
import { useRos } from '~/scripts/ros';
import { MyModal, EmergencyModal, ImageModal } from '~/components/modal';
import AppLayout from '~/components/AppLayout';

const hostName = import.meta.env.VITE_MASTER_HOSTNAME;

export default function Home() {
  var timeoutId: ReturnType<typeof setTimeout> | null = null;
  var timeout = 10000;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(true);
  const [modalString, setModalString] = useState("");
  const [imageTopicName, setImageTopicName] = useState("");

  const { ros } = useRos();

  const openModal = () => { setIsModalOpen(true); };
  const closeModal = () => {
    setIsModalOpen(false);
    if (timeoutId) clearTimeout(timeoutId);
  };

  useEffect(() => {
    if (!ros) return;

    const robotTTSSub = new ROSLIB.Topic({ ros, name: '/talking_sentence', messageType: 'std_msgs/String' });
    robotTTSSub.subscribe(message => {
      if (message.data == "") return;
      setModalString(message.data);
      openModal();
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(closeModal, timeout);
      } else {
        timeoutId = setTimeout(closeModal, timeout);
      }
    });

    const emergencySub = new ROSLIB.Topic({ ros, name: '/hsrb/runstop_button', messageType: 'std_msgs/Bool' });
    emergencySub.subscribe(message => { setIsEmergencyModalOpen(message.data); });

    const imageTopicNameSub = new ROSLIB.Topic({ ros, name: '/image_topic_name', messageType: 'std_msgs/String' });
    imageTopicNameSub.subscribe(message => { setImageTopicName(message.data); });

    return () => {
      robotTTSSub.unsubscribe();
      emergencySub.unsubscribe();
      imageTopicNameSub.unsubscribe();
    };
  }, [ros]);

  return (
    <AppLayout defaultOpen={false}>
      <MyModal isOpen={isModalOpen} onClose={closeModal} modalString={modalString} />
      <EmergencyModal isOpen={isEmergencyModalOpen} onClose={() => setIsEmergencyModalOpen(false)} />
      <ImageModal imageTopicName={imageTopicName} hostName={hostName} />

      <main
        style={{
          backgroundImage: "url('/erasers_logo.png')",
          backgroundSize: 'contain',
          backgroundPosition: 'center center',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
          height: '100%',
          width: '100%',
          overflow: 'auto',
        }}
      >
        <div style={{ height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' }} />
      </main>
    </AppLayout>
  );
}
