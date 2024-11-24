import ModelViewer from '../three/ModelVierwer';

function Bed() {

  return (
    <div className="flex flex-col w-full h-screen bg-gray-100 justify-center items-center pt-8">
      <div className='w-screen h-3/4 p-10 max-w-[900px]'>
        <div className="border-[4px] w-full h-full bg-gray-100 border-opacity-75 border-black rounded-lg shadow-lg">
          <ModelViewer />
        </div>
      </div>

    </div>
  )
}
export default Bed;