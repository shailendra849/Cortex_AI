import { useDispatch, useSelector } from 'react-redux';
import { FaGoogle } from 'react-icons/fa';
import ArtifactPanel from '../components/ArtifactPanel';
import ChatArea from '../components/ChatArea';
import Sidebar from '../components/Sidebar';
import api from '../utils/axios';
import { setUserData } from '../redux/user.slice';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';

function Home() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const login = async (token) => {
    try {
      const { data } = await api.post(`/api/auth/login`, { token });
      dispatch(setUserData(data.user));
    } catch (error) {
      console.log(error);
    }
  };
  const handleGoogleLogin = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    console.log( result);
    const token = await result.user.getIdToken();
    await login(token);
  };

  return (
    <div className="h-screen flex bg-zinc-950 text-white overflow-hidden">
      <Sidebar />
      <ChatArea /> 
      <ArtifactPanel />

      {!userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[340px] bg-zinc-900 border border-zinc-800 rounded-2xl p-7 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-[17px] font-semibold text-zinc-100 tracking-tight">
                Welcome to CortexAI
              </h2>
              <p className="text-[13px] text-zinc-500">Please login to continue using the app.</p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 border border-teal-500/30 transition-colors duration-150 cursor-pointer"
            >
              <FaGoogle size={15} className="text-white" />
              Continue with Google
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
