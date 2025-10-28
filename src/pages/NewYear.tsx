

function NewYear() {

    const t = document.body.getBoundingClientRect().top;

    return (

        <div className="flex flex-col w-full min-h-screen bg-gray-100 justify-center items-center pt-[90px]">
            <div className="h-screen">''''''''''''
                <div className="z-10 sticky h-[90px] mt-[90px] top-[300px] w-full bg-gray-100 text-center font-mono font-bold text-[60px]"> Lunar New Year</div>
                <div className="z-0 sticky h-[180px] pt-5 top-[300px] w-full bg-blue-100 text-center align-text-bottom font-mono font-bold text-[60px]"> belongs to all</div>
                <div className="bg-blue-500 w-[600px] h-[600px] rounded-full" />
                <div className="h-[1000px]"></div>

            </div>
        // {/* <div className="sticky flex flex-col justify-center w-screen h-screen">
        //     <div className="w-full h-1/2 text-center font-mono font-bold text-[60px]"> Lunar New Year</div>
        // </div>
        // <div className="h-[700px]"></div>
        // <div className="bg-blue-500 w-[600px] h-[600px] rounded-full" />
        // <div className="h-[700px]"></div> */}
        // </div>
    )
}
export default NewYear;